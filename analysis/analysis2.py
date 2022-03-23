import sys
from collections import defaultdict

freq = dict()
for line in sys.stdin:
    f, word = line.strip().split()
    freq[word] = float(f)

class Average:
    def __init__(self):
        self.n = 0
        self.v = 0
    def accum(self, v):
        self.v += v
        self.n += 1
    def __str__(self):
        return f"{self.v / self.n}"

hicard = Average()
onepair = Average()
threecards = Average()
twopairs = Average()

for word, f in freq.items():
    lettercount = defaultdict(int)
    for letter in word:
        lettercount[letter] += 1
    if len(lettercount) == 5:
        hicard.accum(f)
    elif len(lettercount) == 4:
        onepair.accum(f)
    else:
        p = 1
        for l,c in lettercount.items():
            p *= (c+1)
        if p == 2*3*3:
            twopairs.accum(f)
        elif p == 2*2*4:
            threecards.accum(f)
        else:
            assert False, lettercount

print(f"Average for high card: {hicard}")
print(f"Average for pair: {onepair}")
print(f"Average for twopair: {twopairs}")
print(f"Average for three of a kind: {threecards}")

P = Average()
L = Average()
PL = Average()

for word, f in freq.items():
    lettercount = defaultdict(int)
    for letter in word:
        lettercount[letter] += 1
    if len(lettercount) == 5:
        if "p" in lettercount:
            P.accum(f)
            if "l" in lettercount:
                PL.accum(f)
        if "l" in lettercount:
            L.accum(f)

print(f"Average for words containing P: {P}")
print(f"Average for words containing L: {L}")
print(f"Average for words containing P and L: {PL}")
