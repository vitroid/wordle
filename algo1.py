import random
from logging import getLogger, basicConfig, INFO, DEBUG
from wordle import Wordle, readdic, query


class Solver1:
    def __init__(self, words, verbose=False):
        self.w = Wordle(words)
        self.words = words
        self.history = []
        self.verbose = verbose
    def trial(self):
        while True:
            candidate = random.choice(self.words)
            acceptable = True
            for c,e,h in self.history:
                exact, hit = query(candidate, c)
                if len(h - hit) != 0:
                    acceptable = False
                if e != exact:
                    acceptable = False
            if acceptable:
                break
        exact, hit = self.w.query(candidate)
        if self.verbose:
            logger.info(f"{self.w.answer} <=> {candidate} : {(exact, hit)}")
        self.history.append([candidate, exact, hit])
        return len(exact.replace(" ", "")) != 5

basicConfig(level=INFO)
logger = getLogger()

words = readdic(open("5letters.txt"))

Nloop = 1
loops = 0
for i in range(Nloop):
    solver = Solver1(words, verbose=(Nloop==1))
    count = 1
    while solver.trial():
        count += 1
    logger.info(solver.history[-1])
    loops += count
print(loops / Nloop)
