'use strict';

class PicGenetic {
  expected = 'This is a very simple test in order to check if this idea works';
  GeneMin = 32;
  GeneMax = 122;
  GeneSpectrum = this.GeneMax - this.GeneMin;

  settings = {
    genelength: this.expected.length,
    populationsize: 1000,
    maxgenerations: 1000,
    solutionfitness: 0,
  };

  tuning = {
    geneshift: new Tune(10, 2, 20),
    geneflips: new Tune(10, 2, 20),
    newkids: new Tune(250, 10, 1000),
    mutate: new Tune(0.3, 0.1, 1.0),
    crossover: new Tune(0.9, 0.1, 1.0)
  };


  /**
   * Eveluates the fitness of a given sequence of genes and returns the result as a number.
   * The number can either be greater for better fitness or lower, depending on the optimisation
   * strategy. The strategy is set using settings.maximise == true / false
   * @param {Array<Number>} sequence The gene sequence to judge
   */
  fitness = (sequence) => {
    // for now, just compare the supplied array of integers to the expected string
    let err = 0;
    for (let i = 0; i < sequence.length; i++) {
      const expect = this.expected.charCodeAt(i);
      const diff = Math.abs(sequence[i] - expect);
      err += diff * diff;
    }

    return Math.sqrt(err);
  }

  /**
  * Fills a new gene with randomly generated genes in the
  * given range (min/max)
  * @return Array<number> of randomly generate genes
  */
  seed = () => {
    const arr = [];
    // fill with random genes for now
    for (let i = 0; i < this.settings.genelength; i++) {
      const fill = Math.floor(Math.random() * (this.GeneSpectrum) + this.GeneMin);
      arr.push(fill);
    }
    return arr;
  }

  /**
  * Picks exactly one being from the whole population.
  * The population cannot be assumed to be ordered by
  * fitness. But it's sorted until __maxSortedIndex__.
  * The items following that index are unsorted.
  * @param {Array<Generation>} population The entire population to choose from
  * @param {number} maxSortedIndex The last index that is sorted ascendingly.
  * @return Genes of a selected being from the population
  */
  pick = (population, maxSortedIndex) => {
    // make it more likely to pick from the front (better fitness)
    const idx = Math.floor(Math.sqrt(Math.random() * maxSortedIndex * maxSortedIndex));
    return population[idx].genes;
  }


  /**
   * Mutates a given sequence by shifting/skewing genes.
   * Modification must be done in-place.
   * @param {Array<Number>} sequence Sequence of genes
   * @param {MasterCaller} Class with access to probabilistic and tuned gene index
   */
  mutate = (sequence, master) => {

    const n = Math.floor(Math.random() * sequence.length / this.tuning['geneflips'].val); // flip up to 10%

    // slightly shift n genes
    const maxShift = this.GeneSpectrum / this.tuning['geneshift'].val;
    for (let i = 0; i < n; i++) {
      const pos = master.getLikelyGeneIndex();

      const shift = Math.floor((Math.random() * maxShift) - (maxShift / 2)); // 10% shift +/-
      sequence[pos] += shift;
      if (sequence[pos] > this.GeneMax) sequence[pos] = this.GeneMax;
      if (sequence[pos] < this.GeneMin) sequence[pos] = this.GeneMin;
    }
  }

  /**
  * Calculates a 2-point crossover and returns two new children
  * @param {Array<Number} mother Seuqnce of genes
  * @param {Array<Number} father Seuqnce of genes
  * @param {MasterCaller} Class with access to probabilistic and tuned gene index
  */
  crossover = (mother, father, master) => {
    let a, b = 0;
    do {
      a = master.getLikelyGeneIndex();
      b = master.getLikelyGeneIndex();
    } while ((a < 1) || (a >= mother.length - 1) || (a >= b));
    // now, we know: [0, ..., a, ..., b, ...n-1]
    const son = mother.slice(0, a).concat(father.slice(a, b)).concat(mother.slice(b));
    const daughter = father.slice(0, a).concat(mother.slice(a, b)).concat(father.slice(b));

    return [son, daughter];
  }


  /**
   * This function is executed in local context (not WebWorker) and used
   * to display regular update information while the WebWorker is still running.
   * @param {Number} generation The # of generations already created
   * @param {Generation} bestSequence Generation object containing .genes and .fitness  
   */
  notify = (generation, bestSequence) => {
    const str = String.fromCharCode(...bestSequence.genes);
    console.log(`Current generation: ${generation}. Best fitness = ${bestSequence.fitness.toFixed(2)}: '${str}'`);
  }
};


async function start() {
  const res = await Concurrency.evolution(new PicGenetic());
  console.log('Finished.');
  console.log(res);
}
