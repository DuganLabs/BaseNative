---
'@basenative/components': patch
---

Table columns wrap between words: cells use `break-word` instead of `anywhere`, so a column never shrinks below its longest word, column headings hold one line, and only `code` inside a cell wraps at any character. The datagrid sort header keeps its chevron inline after the label and centred on it, and drops the sorted-column fill.
