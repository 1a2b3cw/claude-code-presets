# 数据摄入管道

文档解析、清洗、分块的完整实现。

## 使用时机

- 搭建文档摄入管道
- 支持新文档格式
- 优化分块质量

## 文档解析

```python
# ingestion/parsers.py
from pathlib import Path
from abc import ABC, abstractmethod

class BaseParser(ABC):
    @abstractmethod
    async def parse(self, path: Path) -> tuple[str, dict]:
        """Returns (text, metadata)"""
        ...

class PDFParser(BaseParser):
    async def parse(self, path: Path) -> tuple[str, dict]:
        import pypdf
        reader = pypdf.PdfReader(path)
        pages = []
        for i, page in enumerate(reader.pages):
            text = page.extract_text()
            if text.strip():
                pages.append(f"[第{i+1}页]\n{text}")
        return "\n\n".join(pages), {"pages": len(reader.pages), "source": str(path)}

class MarkdownParser(BaseParser):
    async def parse(self, path: Path) -> tuple[str, dict]:
        text = path.read_text(encoding="utf-8")
        title = next((l.lstrip("# ") for l in text.splitlines() if l.startswith("#")), path.stem)
        return text, {"title": title, "source": str(path)}

class DocumentParser:
    _parsers = {".pdf": PDFParser, ".md": MarkdownParser, ".txt": MarkdownParser}

    @classmethod
    def for_file(cls, path: Path) -> BaseParser:
        parser_cls = cls._parsers.get(path.suffix.lower())
        if not parser_cls:
            raise ValueError(f"Unsupported file type: {path.suffix}")
        return parser_cls()
```

## 分块策略

```python
# ingestion/chunkers.py
from dataclasses import dataclass

@dataclass
class Chunk:
    content: str
    metadata: dict
    content_hash: str = ""

    def __post_init__(self):
        import hashlib
        self.content_hash = hashlib.md5(self.content.encode()).hexdigest()

class RecursiveChunker:
    """按段落/句子递归分块，保留语义完整性"""
    SEPARATORS = ["\n\n", "\n", "。", ".", " ", ""]

    def __init__(self, chunk_size: int = 512, overlap: int = 50) -> None:
        self.chunk_size = chunk_size
        self.overlap = overlap

    def split(self, text: str, metadata: dict) -> list[Chunk]:
        raw_chunks = self._recursive_split(text, self.SEPARATORS)
        chunks = []
        for i, content in enumerate(raw_chunks):
            if content.strip():
                chunks.append(Chunk(
                    content=content.strip(),
                    metadata={**metadata, "chunk_index": i, "total_chunks": len(raw_chunks)},
                ))
        return chunks

    def _recursive_split(self, text: str, separators: list[str]) -> list[str]:
        if len(text) <= self.chunk_size or not separators:
            return [text]
        sep = separators[0]
        parts = text.split(sep) if sep else list(text)
        chunks = []
        current = ""
        for part in parts:
            if len(current) + len(part) + len(sep) <= self.chunk_size:
                current += part + sep
            else:
                if current:
                    chunks.append(current)
                    current = current[-self.overlap:] + part + sep  # overlap
                else:
                    # part itself is too large, recurse
                    chunks.extend(self._recursive_split(part, separators[1:]))
        if current.strip():
            chunks.append(current)
        return chunks
```

## 批量摄入脚本

```python
# scripts/ingest.py
import asyncio
from pathlib import Path
import click

@click.command()
@click.argument("directory")
@click.option("--pattern", default="**/*", help="文件 glob 模式")
async def ingest(directory: str, pattern: str):
    root = Path(directory)
    files = [f for f in root.glob(pattern) if f.suffix in (".pdf", ".md", ".txt")]
    
    click.echo(f"找到 {len(files)} 个文件")
    
    store = PgVectorStore(settings.database_url)
    total_chunks = 0
    
    for file in files:
        try:
            n = await ingest_document(file, store)
            total_chunks += n
            click.echo(f"  ✓ {file.name} → {n} chunks")
        except Exception as e:
            click.echo(f"  ✗ {file.name}: {e}", err=True)
    
    click.echo(f"\n完成，共摄入 {total_chunks} 个分块")

if __name__ == "__main__":
    asyncio.run(ingest())
```
