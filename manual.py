from solver import Solver1
import re
from logging import getLogger, basicConfig, INFO, DEBUG
from wordle import readdic, query

def query(_, candidate):
    s = input(f"{candidate} Wordleの返答を入力して下さい。場所が合っていれば大文字、文字だけあっていれば小文字、それ以外は' 'か'.'で。")
    exact = re.sub('[a-z.]', ' ', s).lower()
    match = re.sub('[A-Z.]', ' ', s).replace(' ', '')
    hit = set([letter for letter in match])
    print(exact, hit)
    return exact, hit
    

def main():
    basicConfig(level=INFO)
    logger = getLogger()

    words = readdic(open("5letters.txt"))

    solver = Solver1(words, query=query)
    count = 1
    while solver.trial():
        count += 1

if __name__ == "__main__":
    main()
    