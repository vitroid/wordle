import random
from logging import getLogger, basicConfig, INFO, DEBUG
import sys
import json

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




def benchmark():
    basicConfig(level=INFO)
    logger = getLogger()

    words = readdic(open("5letters.txt"))
    print(json.dumps(words, indent=0))


if __name__ == "__main__":
    benchmark()
