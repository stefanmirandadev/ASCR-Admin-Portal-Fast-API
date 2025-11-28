import asyncio
import json
from pydantic import BaseModel
from agents import Agent, Runner, trace
from dotenv import load_dotenv
from typing import List
from models import CellLineMetadataModel

def get_identification_agent():
    with open("services/curation_service/prompts/cell_line_identification_prompt.md", "r") as f:
        prompt = f.read()
    
    CellLineIdentificationAgent = Agent(
        name="CellLineIdentificationAgent",
        description="An agent that identifies cell lines from text",
        tools=[],
        model="gpt-4.1-mini",
        instructions=prompt,
        output_type=List[str]
    )
    return CellLineIdentificationAgent


def get_curation_agent():
    with open("services/curation_service/prompts/cell_line_curation_prompt.md", "r") as f:
        prompt = f.read()
    
    CellLineCurationAgent = Agent(
        name="CellLineCurationAgent",
        description="An agent that curates cell lines from text",
        tools=[],
        model="gpt-4.1-mini",
        instructions=prompt,
        output_type=CellLineMetadataModel
    )
    return CellLineCurationAgent


