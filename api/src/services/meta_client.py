import os
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()


class MetaRequest:
    def __init__(self):
        self.base_api = os.environ["META_BASE_API"]
        self.api_key = os.environ["META_API_KEY"]

        self.client = OpenAI(
            base_url=self.base_api,
            api_key=self.api_key,
        )