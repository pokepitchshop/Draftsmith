# iostom reference articles

Catalog of source Medium articles used to codify [`style/iostom-style-guide.md`](../style/iostom-style-guide.md) ([POK-371](https://linear.app/pokepitchshop/issue/POK-371/codify-iostom-style-guide-from-existing-medium-articles)).

**Profile:** https://medium.com/@osintiostom

---

## Primary reference series (POK-371)

These three series were read in full to refine voice, structure, and sign-off patterns.

### Pyenv / Poetry / EditorConfig / Safety

Production Python setup — business framing, pyenv install, Poetry deps, pytest, safety scanning.

| Part | Title | URL |
|------|-------|-----|
| — | Development Setup: Python, Pycharm and Pyenv (Ubuntu precursor) | https://medium.com/python-data-science-web/development-setup-python-pycharm-and-pyenv-418b60992b6f |
| 1 | Development Setup: Pyenv, Poetry, EditorConfig, Safety: Part 1 | https://medium.com/python-data-science-web/development-setup-pyenv-poetry-editorconfig-safety-part-1-dc6a22944ac3 |
| 2+ | (continued in series — Poetry, EditorConfig, pytest, Safety) | see Medium profile |

**Style patterns:** series payoff in opening; `brew install pyenv`; screenshot after each CLI step; "This article is a little longer then expected"; tease next part on Poetry.

### Gorilla Mux (Go HTTP routing)

REST API routing — URL params, `mux.Vars()`, incremental route building.

| Article | Title | URL |
|---------|-------|-----|
| 1 | Go: Gorilla Mux how to get URL params | https://osintiostom.medium.com/go-gorilla-mux-how-to-get-url-params-fa702901df38 |

**Style patterns:** problem from real Go API work; step-by-step code; show params with working examples. Draftsmith sample series extends this to Parts 1–3: `series/go-gorilla-mux/`.

### Python OSINT web scraping

Social media / OSINT data collection — BeautifulSoup, Selenium, Requests, Scrapy comparison.

| Part | Title | URL |
|------|-------|-----|
| 1 | Python Web Scraping: Scraping Data From Social Media (OSINT) Part 1 | https://medium.com/python-data-science-web/python-web-scraping-scraping-data-from-social-media-osint-part-1-4bd78195dcd8 |
| 1 (alt) | Python Web Scraping PART:1 | https://medium.com/python-data-science-web/python-web-scraping-part-1-338d5c818641 |

**Style patterns:** "Happy Monday everyone…"; personal motivation (marketing/demographics question); devtools inspect → `find_all` → scrape demo; library pros/cons.

---

## Additional reference series

Used for series structure, cross-links, and Cloud Native voice.

### Cloud Native — Terraform (Parts 1–3)

| Part | Title | URL |
|------|-------|-----|
| 1 | Cloud Native — Terraform Part: 1 | https://medium.com/cloud-native-devops-devsecops/cloud-native-terraform-part-1-900b6a926e25 |
| 2 | Cloud Native — AWS Terraform Part: 2 | https://medium.com/cloud-native-devops-devsecops/cloud-native-aws-terraform-part-2-49067d8fb5d4 |
| 3 | Cloud Native — Terraform Part: 3 | https://medium.com/cloud-native-devops-devsecops/cloud-native-terraform-part-3-4c77e3fc5127 |
| — | Cloud Native: Terraform Env | https://medium.com/cloud-native-devops-devsecops/cloud-native-terraform-env-ca75d4532723 |

**Style patterns:** "In the last article I went over…"; IaC motivation; AWS/Cloud9 setup; link to missed prior part.

### Cloud Native — related

| Title | URL |
|-------|-----|
| Cloud Native — CI/CD, Containers | https://medium.com/cloud-native-devops-devsecops/cloud-native-ci-cd-containers-ede392f37ba0 |
| Cloud Native — Jenkins Setup | https://medium.com/cloud-native-devops-devsecops/cloud-native-jenkins-setup-fac2d370c8b9 |

---

## Other notable articles

| Title | URL | Notes |
|-------|-----|-------|
| Swift Development (series intro) | https://medium.com/learning-swift-by-examples/swift-development-5faaa2a78ed0 | full-stack series payoff line |
| UUID — Mac Users | https://osintiostom.medium.com/uuid-mac-users-b2bc66948b2b | short procedural format |

---

## Adding articles

When cataloging new source material:

1. Add row with title, URL, and 1–2 **style patterns** observed.
2. If part of a series, group under a heading and note cross-link phrasing.
3. Update `style/iostom-style-guide.md` only when patterns generalize across posts.
