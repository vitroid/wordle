from solver import Solver, readdic
import re
from logging import getLogger, basicConfig, INFO, DEBUG


class ManualSolver(Solver):
    def __init__(self, verbose=False):
        self.history = []
        self.verbose = verbose
    def query(self, candidate):
        s = input(f"{candidate}:")
        exact = re.sub('[^A-Z]', ' ', s).lower()
        match = re.sub('[^a-z]', ' ', s).replace(' ', '')
        hit = set([letter for letter in match])
        print(exact, hit)
        return exact, hit
    

def main():
    basicConfig(level=INFO)
    logger = getLogger()

    words = readdic(open("5letters.txt"))

    solver = ManualSolver()
    count = 1
    print("Input the reply by Wordle. Green and yellow letters are represented by upper and lower cases, and other (unmatched) letters by other symbols such as '.' or '_'")
    while solver.trial(words):
        count += 1

if __name__ == "__main__":
    main()
    