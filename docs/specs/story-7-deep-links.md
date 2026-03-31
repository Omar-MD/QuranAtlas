# Story 7: Review deep links | P3 | Requires: Story 5

- Route `#/t/{tag_label}`: URL-decode, validate via input-validator.js (validateTagParam), lookup in IDB by-tag index; not found → "tag not found" state with link to review hub (not error page); resolve <500 ms
- IDB: marks (by-tag index); router: `#/t/{tag_label}`
