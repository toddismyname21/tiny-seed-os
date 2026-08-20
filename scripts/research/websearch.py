#!/usr/bin/env python3
"""
websearch.py — general web search from Bash, for agents that have no WebSearch tool.

WHY THIS EXISTS
---------------
Only 2 of this repo's 9 agents declare the WebSearch tool (researcher,
marketing-claude), and even the researcher reported "No such tool available" at
runtime on 2026-08-20 — twice. Two full research passes on multi-agent
architecture were therefore completed WITHOUT open-web coverage, and both said
so in their method notes. That is a serious gap when the output is used to make
architecture decisions.

Outbound HTTPS works fine from Bash. What failed was scraping search engines
WITHOUT a browser User-Agent — DuckDuckGo, Bing and SearXNG all return
bot-challenge pages to a bare client. With a normal UA, DDG's html endpoint
returns clean, parseable results (verified 2026-08-20: HTTP 200, 10 results).

So this is not a workaround for a network problem. It is the missing tool,
reimplemented with the one header that makes it work.

USAGE
-----
    python3 scripts/research/websearch.py "supabase branching migrations"
    python3 scripts/research/websearch.py "nx module boundaries" --n 15
    python3 scripts/research/websearch.py "claude code worktree" --json

HONEST LIMITS — read before trusting results
--------------------------------------------
  * DuckDuckGo's html endpoint is undocumented and unversioned. If the markup
    changes this breaks. It reports 0 results rather than pretending.
  * No date filtering. Recency must be judged from the fetched page itself.
  * Results are a starting point for FETCHING pages, not evidence in themselves.
    Never cite a search snippet — fetch the page and read it.
  * Be a good citizen: it sleeps between queries. Do not hammer it in a loop.
"""
from __future__ import annotations
import argparse, html, json, re, sys, time, urllib.parse, urllib.request

UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/124.0 Safari/537.36")
ENDPOINT = "https://html.duckduckgo.com/html/"


def search(query: str, n: int = 10, timeout: int = 30):
    url = f"{ENDPOINT}?q={urllib.parse.quote(query)}"
    req = urllib.request.Request(url, headers={
        "User-Agent": UA,
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
    })
    with urllib.request.urlopen(req, timeout=timeout) as r:
        page = r.read().decode("utf-8", "ignore")

    if re.search(r"anomaly|captcha|unusual traffic", page, re.I):
        raise RuntimeError("bot-challenged by the search endpoint — back off and retry later")

    out = []
    for href, title in re.findall(
        r'<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>(.*?)</a>', page, re.S
    ):
        m = re.search(r"uddg=([^&]+)", href)
        link = urllib.parse.unquote(m.group(1)) if m else href
        out.append({
            "title": html.unescape(re.sub(r"<[^>]+>", "", title)).strip(),
            "url": link,
        })
        if len(out) >= n:
            break

    # snippets, best-effort — positional pairing, so guard the length
    snips = [html.unescape(re.sub(r"<[^>]+>", "", s)).strip() for s in
             re.findall(r'<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>(.*?)</a>', page, re.S)]
    for i, o in enumerate(out):
        o["snippet"] = snips[i] if i < len(snips) else ""
    return out


def main() -> int:
    ap = argparse.ArgumentParser(description="Web search for agents without a WebSearch tool.")
    ap.add_argument("query", nargs="+")
    ap.add_argument("--n", type=int, default=10, help="max results (default 10)")
    ap.add_argument("--json", action="store_true", help="emit JSON")
    a = ap.parse_args()
    q = " ".join(a.query)
    try:
        res = search(q, a.n)
    except Exception as e:
        print(f"SEARCH FAILED: {e}", file=sys.stderr)
        return 1
    if a.json:
        print(json.dumps(res, indent=1))
        return 0
    if not res:
        print("0 results — the endpoint's markup may have changed; verify by hand before trusting this.")
        return 1
    print(f'"{q}" — {len(res)} results\n')
    for i, r in enumerate(res, 1):
        print(f"{i}. {r['title']}")
        print(f"   {r['url']}")
        if r["snippet"]:
            print(f"   {r['snippet'][:180]}")
        print()
    time.sleep(1)   # be polite
    return 0


if __name__ == "__main__":
    sys.exit(main())
