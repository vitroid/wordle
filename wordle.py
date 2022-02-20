import random
from logging import getLogger, basicConfig, INFO, DEBUG


def query(answer, challenge):
    hit = set()
    for letter in challenge:
        if letter in answer:
            hit.add(letter)
    exact = ""
    for i in range(len(answer)):
        if answer[i] == challenge[i]:
            exact += answer[i]
        else:
            exact += " "
    return exact, hit


class Wordle():
    def __init__(self, d):
        logger = getLogger()
        self.answer = random.choice(d)
        logger.info(f"Answer: {self.answer}")
    def query(self, challenge):
        return query(self.answer, challenge)

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
