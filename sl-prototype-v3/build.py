#!/usr/bin/env python3
"""Combine src/ + vendor three.min.js into one self-contained index.html."""
import pathlib
d = pathlib.Path(__file__).parent
r = lambda p: (d / p).read_text(encoding='utf-8')
js = '\n'.join(r('src/' + f) for f in ['data.js', 'widgets.js', 'camp.js', 'page.js'])
html = f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Scout Life: Camp Scout Life 3D Homepage Prototype v3 (Walk Mode)</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Alfa+Slab+One&family=Atkinson+Hyperlegible:wght@400;700&family=Zilla+Slab:wght@600;700&display=swap" rel="stylesheet">
<style>
{r('src/styles.css')}
</style></head><body>
{r('src/body.html')}
<script>/* three.js r149, MIT License (c) three.js authors */
{r('vendor/three.min.js')}</script>
<script>
{js}
</script>
</body></html>
"""
(d / 'index.html').write_text(html, encoding='utf-8')
print('index.html', len(html) // 1024, 'KB')
