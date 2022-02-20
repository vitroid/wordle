import random
from logging import getLogger, basicConfig, INFO, DEBUG
from wordle import readdic, query
import wordle
import sys

class Solver1:
    def __init__(self, words, answer="", verbose=False, query=query):
        self.answer = answer
        if answer == "":
            self.answer = random.choice(words)
        self.words = words
        self.history = []
        self.verbose = verbose
        self.query = query
    def trial(self):
        logger = getLogger()
        while True:
            candidate = random.choice(self.words)
            acceptable = True
            for c,e,h in self.history:
                exact, hit = wordle.query(candidate, c)
                if len(h - hit) != 0:
                    acceptable = False
                if e != exact:
                    acceptable = False
            if acceptable:
                break
        exact, hit = self.query(self.answer, candidate)
        if self.verbose:
            logger.info(f"{self.answer} <=> {candidate} : {(exact, hit)}")
        self.history.append([candidate, exact, hit])
        return len(exact.replace(" ", "")) != 5


def main():
    basicConfig(level=INFO)
    logger = getLogger()

    words = readdic(open("5letters.txt"))

    Nloop = 1
    answer = ""
    if len(sys.argv) > 1:
        try:
            Nloop = int(sys.argv[1])
        except:
            answer = sys.argv[1]
            assert len(answer) == 5

    loops = 0
    for i in range(Nloop):
        solver = Solver1(words, answer=answer, verbose=(Nloop==1))
        count = 1
        while solver.trial():
            count += 1
        logger.info([solver.history[-1], count])
        loops += count
    print(loops / Nloop)


if __name__ == "__main__":
    main()
