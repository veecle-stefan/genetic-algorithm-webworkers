# genetic-js

Javascript libraries for Genetic Algorithms that uses **multiple** ```WebWorkers``` to implement a multi-threading
genetic algorithm.

## Concept
A ```WebWorker``` (thread) is spawned for each physical CPU and then used to outsouce expensive calculations in parallel.
More concretely, the total population that is evolved is copied to each CPU worker and then each worker independently finds
new genes using the developer-provided implementations for  ```mutation()``` and ```crossover()```. The population is kept at
the same size by regularly combining the fittest children from all CPUs in a common, fit pool, which is again spread across
all CPUs. The process continues to loop based on the new generation of fitter children and so on.

Makes **Genetic Algorithms** scale linearly.

## Implementation
The developer must prove a class at instantiation time that implements the following functions

```
/**
 * Eveluates the fitness of a given sequence of genes and returns the result as a number.
 * The number can either be greater for better fitness or lower, depending on the optimisation
 * strategy. The strategy is set using settings.maximise == true / false
 * @param {Array<Number>} sequence The gene sequence to judge
 */
fitness = (sequence) => {

}

/**
* Fills a new gene with randomly generated genes in the
* given range (min/max)
* @return Array<number> of randomly generate genes
*/
seed = () => {

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

}


/**
 * Mutates a given sequence by shifting/skewing genes.
 * Modification must be done in-place.
 * @param {Array<Number>} sequence Sequence of genes
 * @param {MasterCaller} Class with access to probabilistic and tuned gene index
 */
mutate = (sequence, master) => {

}

/**
* Calculates a 2-point crossover and returns two new children
* @param {Array<Number} mother Seuqnce of genes
* @param {Array<Number} father Seuqnce of genes
* @param {MasterCaller} Class with access to probabilistic and tuned gene index
*/
crossover = (mother, father, master) => {

}


/**
 * This function is executed in local context (not WebWorker) and used
 * to display regular update information while the WebWorker is still running.
 * @param {Number} generation The # of generations already created
 * @param {Generation} bestSequence Generation object containing .genes and .fitness  
 */
notify = (generation, bestSequence) => {
  
}
```
