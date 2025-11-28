from pydantic import BaseModel
from agents import Agent, Runner, trace
from my_agents import get_identification_agent, get_curation_agent


class CurationWorkflow():
    def __init__(self, article: bytes, config: dict):
        self.article = article
        self.config = config

    def run(self):
        
        identification_agent = get_identification_agent()
        curation_agent = get_curation_agent()

        identification_runner = Runner(identification_agent)
        curation_runner = Runner(curation_agent)

        identification_result = identification_runner.run(self.article)
        curation_result = curation_runner.run(identification_result)

        return curation_result
        