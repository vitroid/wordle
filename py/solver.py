import random
from logging import getLogger, basicConfig, INFO, DEBUG
import sys


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


class Solver:
    def __init__(self, answer, verbose=False):
        self.answer = answer
        self.history = []
        self.verbose = verbose
    def evaluate(self, answer, challenge):
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
    def query(self, candidate):
        return self.evaluate(self.answer, candidate)
    def trial(self, words):
        logger = getLogger()
        while True:
            candidate = random.choice(words)
            acceptable = True
            for c,e,h in self.history:
                exact, hit = self.evaluate(candidate, c)
                if len(h - hit) != 0:
                    acceptable = False
                if e != exact:
                    acceptable = False
            if acceptable:
                break
        exact, hit = self.query(candidate)
        if self.verbose:
            logger.info(f"{self.answer} <=> {candidate} : {(exact, hit)}")
        self.history.append([candidate, exact, hit])
        return len(exact.replace(" ", "")) != 5


def benchmark():
    basicConfig(level=INFO)
    logger = getLogger()

    words = readdic(open("5letters.txt"))

    Nloop = 1
    answer = random.choice(words)
    if len(sys.argv) > 1:
        try:
            Nloop = int(sys.argv[1])
        except:
            answer = sys.argv[1]
        assert len(answer) == 5

    loops = 0
    for i in range(Nloop):
        solver = Solver(answer, verbose=(Nloop==1))
        answer = random.choice(words)
        count = 1
        while solver.trial(words):
            count += 1
        logger.info([solver.history[-1], count])
        loops += count
    print(loops / Nloop)


if __name__ == "__main__":
    benchmark()
