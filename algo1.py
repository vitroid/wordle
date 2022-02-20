import random
from logging import getLogger, basicConfig, INFO, DEBUG
from wordle import Wordle, readdic


class Solver1:
    def __init__(self, words):
        self.w = Wordle(words)
        self.words = words
        self.history = []
    def query_simulator(self, answer, challenge):
        hit = set()
        for letter in challenge:
            if letter in answer:
                hit.add(letter)
        exact = {}
        for i in range(len(answer)):
            if answer[i] == challenge[i]:
                exact[i] = answer[i]
        return exact, hit
    def trial(self):
        while True:
            candidate = random.choice(self.words)
            acceptable = True
            for c,e,h in self.history:
                exact, hit = self.query_simulator(candidate, c)
                if len(h - hit) != 0:
                    acceptable = False
            if acceptable:
                break
        exact, hit = self.w.query(candidate)
        # logger.info(f"{self.w.answer} <=> {candidate} : {(exact, hit)}")
        self.history.append([candidate, exact, hit])
        return len(exact) != 5

basicConfig(level=INFO)
logger = getLogger()

words = readdic(open("5letters.txt"))

loops = 0
for i in range(1000):
    solver = Solver1(words)
    count = 1
    while solver.trial():
        count += 1
    logger.info(solver.history[-1])
    loops += count
print(loops / 1000)
