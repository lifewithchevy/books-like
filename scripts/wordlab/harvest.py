#!/usr/bin/env python3
"""
Harvest a Reddit corpus for word scoring, with no browser and no login.

Reddit's JSON API 403s from a script and the site itself is blocked here, but
the .rss endpoints are public and return the post body in <content>. That makes
the whole pipeline runnable from cron instead of by hand.

Two corpora matter:
  baseline  general romantasy talk, harvested once and reused
  book      only posts that actually mention the title or author

That filter is the fix for the failure that made Caraval's "fandom words" come
back as MARIO and TRUMP: searching a common title pulls in unrelated subs, so
every post is checked for the book before its text is kept.
"""
import argparse, html, re, sys, time, urllib.parse, urllib.request

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126 Safari/537.36"


def fetch(url, tries=3):
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            return urllib.request.urlopen(req, timeout=30).read().decode("utf-8", "ignore")
        except Exception as e:
            if i == tries - 1:
                print(f"  ! {e}", file=sys.stderr)
                return ""
            time.sleep(15)


def entries(xml):
    """(title, plain-text body) for each RSS entry."""
    out = []
    for e in re.findall(r"<entry>(.*?)</entry>", xml, re.S):
        t = re.search(r"<title>(.*?)</title>", e, re.S)
        c = re.search(r'<content type="html">(.*?)</content>', e, re.S)
        title = html.unescape(t.group(1)) if t else ""
        body = html.unescape(html.unescape(c.group(1))) if c else ""
        body = re.sub(r"<[^>]+>", " ", body)
        out.append((title, body))
    return out


def harvest(urls, must=None, pause=6.0):
    """must: list of lowercase strings, at least one of which a post must contain."""
    seen, kept, dropped, text = set(), 0, 0, []
    for u in urls:
        for title, body in entries(fetch(u)):
            key = title[:90]
            if key in seen:
                continue
            seen.add(key)
            if must and not any(m in (title + " " + body).lower() for m in must):
                dropped += 1
                continue
            kept += 1
            text.append(title + " " + body)
        time.sleep(pause)
    return " ".join(text), kept, dropped


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--out", required=True)
    p.add_argument("--subs", nargs="*", default=[], help="harvest these subs wholesale")
    p.add_argument("--search", nargs="*", default=[], help="search phrases")
    p.add_argument("--in-subs", nargs="*", default=["fantasyromance", "romantasy", "books"],
                   help="subs to search within (also searched sitewide)")
    p.add_argument("--must", nargs="*", default=[], help="post must mention one of these")
    args = p.parse_args()

    urls = []
    for s in args.subs:
        for sort, extra in (("top", "t=all"), ("top", "t=year"), ("hot", "")):
            urls.append(f"https://www.reddit.com/r/{s}/{sort}.rss?{extra}&limit=100")
    for q in args.search:
        qq = urllib.parse.quote(q)
        urls.append(f"https://www.reddit.com/search.rss?q={qq}&sort=top&t=all&limit=100")
        for s in args.in_subs:
            urls.append(f"https://www.reddit.com/r/{s}/search.rss?q={qq}&restrict_sr=1&sort=top&t=all&limit=100")

    must = [m.lower() for m in args.must]
    text, kept, dropped = harvest(urls, must or None)
    open(args.out, "w").write(text)
    words = len(re.findall(r"\b[A-Za-z]{5}\b", text))
    print(f"{args.out}: {kept} posts kept, {dropped} filtered out, {words:,} five-letter tokens")


if __name__ == "__main__":
    main()
