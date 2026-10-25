# TitanApt Project Audit

Date: 2026-10-25
Auditor: opencode (build session)
Workspace: `E:\VEERASINGAM\TitanApt`

## 1. Confirmed current state

The workspace is **not a Git repository** (`git status` unavailable: no `.git` directory).

Before this build, the workspace contained **no application source code, no package.json, no database, no API, no tests and no routes**. It contained only source documents, reference media and an empty Refact task index.

| Area | Finding |
|---|---|
| Languages / frameworks | None installed in the workspace. Global tools present: Node.js v26.3.0, npm 11.16.0, Python 3.14.3 with pypdf, Git 2.53.0. |
| Package manager / lockfile | None before the build. |
| Database engine | None running. `psql` is not installed. Nothing listens on `localhost:5432`. Docker is not installed. |
| Existing auth | None. No accounts, sessions, cookies or password hashes exist. |
| Existing routes/screens | None. |
| Existing tests / CI | None. |
| Existing `.env` | None. No secrets were found in the workspace. |

## 2. Source assets (measured)

All hashes are SHA-256 and were read from the actual files. Page counts were read with pypdf.

| File | Bytes | SHA-256 | Pages |
|---|---:|---|---:|
| `Aptitude&Mock.pdf/IT_Companies_Guide.pdf` | 1,843,438 | `3ACE6BB842A44A6D33D9D1FC59FAC2D6E63E107A9402CCFEFFE6E858C9704997` | 57 |
| `Aptitude&Mock.pdf/TitanApt_10000.pdf` | 11,955,116 | `7B89360241EF5633ED41D584450C1EA4124186222FF5D42070DFC828DB72A0F4` | 4,939 |
| `Aptitude&Mock.pdf/Top25_India.pdf` | 1,039,078 | `571679DAA90F8F44740E82458F808F61574E7C8245E03FDE734747E3EE65A612` | 428 |
| `Learning.Hub/Volume1.pdf` | 304,136 | `4195DBEE5CCDA6ED6B35D3CA7B89A5A087092ECB8894A4732B7AFFB04575E517` | 97 |
| `Learning.Hub/Volume2.pdf` | 388,356 | `7A695182A6DE4636329E1F0283A7FDDDEDF8D9F0950C616A8608831F3EB16C57` | 122 |
| `Learning.Hub/Volume3.pdf` | 304,070 | `E862F0E7122E5A8F5D82E70D32983282DFB69511448F823425B4BD4F11F65222` | 88 |
| `Learning.Hub/Volume4.pdf` | 511,973 | `FADED6F2FA6F6498699C77403BE5E7C74B353E96DE3370A566AEB920F7550DC1` | 152 |
| `Learning.Hub/Volume5.pdf` | 444,746 | `4287578073F68B95E50B0D964E60D72E8CDD123D2C89B86BD83EF1FEAF0B9063` | 104 |
| `Learning.Hub/Volume6.pdf` | 447,946 | `B7379589EB88B94B5E54A0B27998F68849764D231D1C06BA6DC9E1C3582B842D` | 142 |
| `Learning.Hub/Volume7.pdf` | 241,860 | `82464BFCEB34CD02073106E6195CB11FD8A1306BA4DABFF11ECBC045C655B68F` | 48 |
| `Learning.Hub/Volume8.pdf` | 395,595 | `ADEB885B6AD6845264DCFB5589DE996682252FFC62BE177677688435F4CB1D02` | 64 |
| `TitanApt.Prompt/TitanApt.Prompt.pdf` | 101,151 | `A2382E4172F42BB0C4FFF04C1EAD7323093A0C1D7030ED83AEB2CB86D9BCFB98` | 30 |

### Extraction status

| Source | Status |
|---|---|
| `TitanApt_10000.pdf` | Text layer present. 25 chapters detected: Number System through Vocabulary, 4,939 pages. No OCR required for sampled pages. |
| `IT_Companies_Guide.pdf` | Text layer present. 25 canonical company profiles plus a Zoho profile at no. 26. The guide states 0 of 25 logos are embedded and forbids lookalikes. |
| `Top25_India.pdf` | Text layer present. Company-style original mock questions with the guide's own disclaimer (not real company papers, no human review recorded). |
| Learning Hub Volumes 1–8 | Text layer present; used as provenance for lessons and formula references. |
| Reference images and videos | 15 local assets (4 PNG, 1 JPG, 6 MP4, 4 screenshots). They are inspiration media only and are **not** treated as official brand or company assets. |
| `TitanApt.Prompt.pdf` | Read in full. All six sections reviewed before implementation. |

No asset was overwritten, moved or deleted.

## 3. Reported defect

No application existed, so there was no signup/signin runtime to trace. The audit found no reproducible application defect. Any auth issue in the inherited material would have been a missing implementation, not a failing one.

- Confirmed cause of "no working signup": no backend, database, session store or frontend auth UI existed.
- Probable causes: none; no code existed.

## 4. Migration decision

The workspace does not use a conflicting stack (PHP/MySQL/XAMPP or otherwise). It is an empty application root around source assets.

Decision: **build the target stack in place, alongside all source assets**, using:

- React + Vite + TypeScript web app
- Node.js + Express + TypeScript API
- PostgreSQL + Prisma
- Embedded PostgreSQL binaries for local development because PostgreSQL and Docker are absent from this Windows environment

Because no database or learner data existed, there is no data migration. Rollback is trivial: application files are additive and the source PDFs and reference media are untouched. The local database lives under `.pgdata/` and can be discarded safely.

## 5. Known environment constraints

- PostgreSQL server is not installed system-wide and Docker is unavailable. The build uses the `embedded-postgres` package to provide a real PostgreSQL server for local use. Production must point `DATABASE_URL` at a managed or self-hosted PostgreSQL instance.
- No OCR tool (Tesseract) is installed. Sampled source PDFs have text layers, so OCR was not needed.
- Playwright browser installation is optional and may be unavailable; browser checks are reported honestly in `docs/TEST_REPORT.md`.
- Official company logos were not supplied. The design uses accessible initials fallbacks and does not imitate any logo.
