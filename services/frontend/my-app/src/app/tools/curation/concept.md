#

Curation page feature concept

## Start AI Curation

Background

- User selects document(s) and clicks Start AI Curation

How to hit the backend from the frontend

- Send an array of input documents


First step is a function that just iterates through every document it received.

For every document selected do:

Process

- Verify that the document is (i) pdf or (ii) text document
- If pdf submit to vision curation
- If text submit to text curation TODO

Vision curation

- Verify that the document is pdf
- Create request with

  - Document
  - Curation instructions
  - Output schema
- **SEND** request to curation agent
- Received raw curated response

  - **SEND** raw curated response to normalization Agent
- **RECEIVE** normalised response
- **PRESENT** normalised response on front page
