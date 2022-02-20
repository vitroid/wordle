import random
from logging import getLogger, basicConfig, INFO, DEBUG


class Wordle():
    def __init__(self, d):
        logger = getLogger()
        self.answer = random.choice(d)
        logger.info(f"Answer: {self.answer}")

    def query(self, challenge):
        hit = set()
        for letter in challenge:
            if letter in self.answer:
                hit.add(letter)
        exact = {}
        for i in range(len(self.answer)):
            if self.answer[i] == challenge[i]:
                exact[i] = self.answer[i]
        return exact, hit

def readdic(f):
    words = []
    while True:
        word = f.readline()
        if len(word) == 0:
            break
        word = word.strip().lower()
        if len(word) == 5:
            words.append(word)
    return words
