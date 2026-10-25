# TitanApt Content Provenance

## 1. Source-first policy

TitanApt was built around the supplied local source material:

- `TitanApt.Prompt/TitanApt.Prompt.pdf` — product requirements.
- `Aptitude&Mock.pdf/TitanApt_10000.pdf` — aptitude question source.
- `Aptitude&Mock.pdf/IT_Companies_Guide.pdf` — company profiles and logo policy.
- `Aptitude&Mock.pdf/Top25_India.pdf` — company-style original mock questions.
- `Learning.Hub/Volume1.pdf` through `Volume8.pdf` — lesson and formula references.
- Reference images and videos — visual inspiration only.

No source PDF was overwritten, moved, or deleted. Hashes and page counts are recorded in [PROJECT_AUDIT.md](PROJECT_AUDIT.md). The source assets remain the authoritative copies.

## 2. Question bank

### Initial seed

- 200 sample questions, eight per topic.
- 175 are `APPROVED` and available to learners.
- 25 are `PENDING` and excluded from practice, mock selection, and lesson checkpoints.
- Each seeded question has a source document, source page, source key, source check, difficulty, explanation, reasoning, steps, and fingerprint.
- The sample is not a full import of the 4,939-page question PDF.
- No question is approved without a correct option and explanation.

Pending sample distribution:

| Topic | Pending |
|---|---:|
| Profit and Loss | 6 |
| Simple and Compound Interest | 6 |
| Seating Arrangement | 5 |
| Probability | 1 |
| Permutation and Combination | 1 |
| Geometry and Mensuration | 1 |
| Data Interpretation | 1 |
| Number Series | 1 |
| Coding and Decoding | 1 |
| Blood Relations | 1 |
| Direction Sense | 1 |

These remain pending to keep the review workflow real. They can be reviewed in the admin desk with the same approval gates as imported content.

### Bounded importer

The importer is a real extraction path, not a simulated fixture:

- Reads only the text layer.
- Does not run OCR.
- Uses the PDF outline to find chapter page ranges.
- Extracts Q blocks with options and answer/explanation sections.
- Creates raw page records and candidate records.
- Creates new questions as `PENDING` with source page and source key.
- Deduplicates by unique source key and normalized fingerprint.
- Records duplicate/invalid candidates with warnings.
- Requires a human reviewer before a question reaches learners.

Verified import examples:

- Chapter 1, limit 10: 7 pages scanned, 10 candidates, 2 new pending questions, 8 duplicates.
- The same run repeated: 10 duplicates, 0 new questions.
- Chapter 2, limit 5: 5 candidates, 0 new questions because the seeded sample already covered them.

The full 10,000-question PDF contains 4,939 pages. Importing and reviewing it end-to-end remains an operational task.

## 3. Lessons

- 25 lessons, one per topic.
- Each lesson includes objective, explanation, analogy, worked examples, rule, common mistakes, memory tip, practice metadata, and a source reference.
- Lessons are seeded as `APPROVED` because they were authored from the supplied Learning Hub volumes for this build.
- Source references name the relevant Learning Hub material.
- Lesson checkpoints use approved questions from the same topic.
- Lesson completion requires a minimum checkpoint score.
- These lessons were authored in this build; they are not a verbatim reproduction of the source PDFs.

No external reviewer identity is claimed. The source reference is the provenance record.

## 4. Topics

The 25 topics cover:

- Quantitative aptitude: number system, percentages, profit and loss, ratio and proportion, averages, interest, time and work, speed and distance, mixtures, algebra, progressions, probability, permutations and combinations, geometry and mensuration.
- Data interpretation.
- Logical reasoning: number series, coding and decoding, blood relations, direction sense, seating arrangement, syllogisms, statement and conclusion, analogy.
- Verbal ability: grammar and usage, vocabulary.

Topics are published and ordered to match the chapter structure of the question source. Each topic records a chapter order from 1 to 25, which the importer uses to map chapter numbers to topics.

## 5. Companies

- 25 canonical companies are included.
- Profiles come from `IT_Companies_Guide.pdf` and were normalized for consistent fields.
- Zoho appears as profile no. 26 in the guide but was excluded from the 25-company catalogue.
- Each profile includes overview, website, headquarters, founding information, parent, main business, industries, technology, platforms, careers link, source note, verification date, and mapped topic slugs.
- The guide states that no official logo artwork was supplied and forbids lookalike logos.
- TitanApt therefore renders typographic initials and states that official logos were not supplied.
- No placement claims, salary claims, vacancy counts, or official paper claims are derived from the company guide.
- `Top25_India.pdf` is treated as company-style original mock material with its own disclaimer, not as real company papers.

## 6. Mock tests

- “Aptitude Foundation Mock”: 20 questions, 30 minutes.
- “Placement Readiness Mock”: 28 questions, 45 minutes.
- Marking: +1 correct, −0.25 incorrect, 0 unanswered.
- Both are original TitanApt mocks assembled from approved sample questions.
- The UI and seed notes state that they are not real company papers.
- Mock composition is validated against the available approved question pool at start time.

## 7. Review states

Question review statuses:

| Status | Learner visibility | Meaning |
|---|---|---|
| `PENDING` | No | Imported or seeded but not verified |
| `NEEDS_FIX` | No | Requires correction |
| `QUARANTINED` | No | Suspect content held out of circulation |
| `APPROVED` | Yes, if correct option is set | Verified for learner use |
| `REJECTED` | No | Not usable |
| `RETIRED` | No | Removed from active use |

Lesson statuses include `DRAFT`, `IN_REVIEW`, `APPROVED`, and `RETIRED`. Learner content queries only use approved lessons and published topics.

## 8. Duplicate and quality controls

- Source keys identify a question by chapter and original question number.
- Fingerprints normalize stems and options to detect near-duplicate content even when source numbering differs.
- Invalid structure, missing answers, and duplicate candidates are preserved for review rather than silently discarded.
- Approval requires an existing correct option, at least two options, and a non-empty explanation.
- Learner flags allow reported issues to enter the review desk.
- Admin audit records all review decisions and imports.

## 9. Brand and legal boundaries

- No official company logo is embedded or recreated.
- No claim is made that questions are official company placement papers.
- No salary, vacancy, selection, or outcome guarantee is made.
- Source PDFs are supplied local project material; no public redistribution rights are implied.
- The product is private and not represented as affiliated with any listed company.
- Reference media is not treated as official brand material.
