# Wordle guesser

* A Svelte implementation is [here](https://vitroid.github.io/wordle/).
* And the Wordle is [here](https://www.nytimes.com/games/wordle/index.html)

## Statistics

The algorithm finds the correct word on average n=3.3 times. However, not every word has the same difficulty level, and some words are more difficult to predict than others. The following is a list of statistically examined words that are difficult to guess.

### Very hard (n>5)

* grape
* feeds
* kills
* bales
* graze
* sakes
* hound
* pears
* mound
* shave
* pills
* gears (6.2)

### Hard (n>4.5)

* miner
* oases
* bumps
* volts
* cages
* dives
* foxes
* pails
* waded
* piped
* zones
* fools
* fives
* texts
* sixes
* saves
* bikes
* robes
* pines
* batch
* wakes
* feats
* baker

Some of the general trends that can be seen from the statistics:

* Words ending in -s, especially those ending in -es, are difficult to guess because there are similar words.
   * Words ending in -s: 3.5 times
   * Words ending in -es: 4.0 times
* Words ending in -ound are also difficult: 5.3 times
* Words ending in -ills: 4.9 times.

* The number of times to get the correct answer varies depending on the first word entered. For example, if the word "PLACE" is entered first, the correct answer is obtained in the 3.2 times, but if "PUPPY" is entered first, it takes 3.9 times.
  As an easy way to remember:

  1. Don't start with words with hands in poker: ADDED, PUPPY, GEESE, ERROR (three of a kind), RADAR, VIVID, ARRAY (two pair).
     * Words containing pair: 3.5 times
     * Words containing two-pair: 3.7 times
     * Words containing three-of-a-kind: 3.8 times
  2. Choose the word containing P and L.
     * Words containing both P and L: 3.2 times

Note that these strategies depend on the dictionary used for the wordle questions. And wordle dictionaries are not publicly available; there is a theory that the New York Times' wordle does not include plurals or past tenses.

* https://www.elitedaily.com/news/does-wordle-use-repeat-letters-same-letter-twice-plural-past-tense