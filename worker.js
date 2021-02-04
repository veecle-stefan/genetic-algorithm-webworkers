'use strict';
function worker_function(workerNum) {

  this.deserialise = (str) => {
    return JSON.parse(str, function (key, value) {
      if (typeof value != "string") return value;
      if (value.lastIndexOf("__func__:", 0) === 0) return eval('(' + value.slice(9) + ')');
      if (value.lastIndexOf("__regex__:", 0) === 0) return eval('(' + value.slice(10) + ')');
      return value;
    });
  };

    class Generation {
      fitness = 0;
      genes = [];

      constructor(genes, fitness) {
        this.genes = genes;
        this.fitness = fitness;
      }
    };

    class MasterCaller {
      rankedIndices = [];
      rankedSum = 0;

      constructor (geneProb) {
        this.rankedSum = 0;
        for (let i = 0; i < geneProb.length; i++) {
          this.rankedSum += geneProb[i];
          this.rankedIndices.push(this.rankedSum);
        }
      }

      binarySearch (idx) {
        let start = 0;
        let end = this.rankedIndices.length - 1;

         // Iterate while start not meets end
         while (start <= end) {
          // Find the mid index
          let mid = Math.floor((start + end) / 2);

          // if it's the last element, it must be greater
          if (mid == 0) {
           return mid;
          }
          // If idx fits inside, return real index
          if ((idx < this.rankedIndices[mid]) && (idx >= this.rankedIndices[mid-1])) {
             return mid; // return the real index
           } else if (this.rankedIndices[mid] < idx) {
             // look in right half accordingly
             start = mid + 1;
            } else {
              // look in left half accordingly
              end = mid - 1;
            }
         }
         this.doesnotexist();

         return false;
      }

      getLikelyGeneIndex () {
        const continuousIdx = Math.random() * this.rankedSum;
        // convert to rank through indirection
        return this.binarySearch(continuousIdx);
      }
    }

    this.functions = null;

    this.pickN = (n, population, stableSorted) => {
      // first pick one
      const selected = [ this.functions.pick(population, stableSorted) ];

      // then make sure the others are not already selected
      for (let i = 1; i < n; i++) {
        let nextpick = null;
        do {
          nextpick = this.functions.pick(population, stableSorted);
        } while (selected.includes(nextpick));
        selected.push(nextpick);
      }
      return selected;

    };

    this.addChild = (genetics, genes) => {
      const fitness = this.functions.fitness(genes);
      genetics.population.push(new Generation(genes, fitness));
    },

    this.evolve = (genetics) => {
      const master = new MasterCaller(genetics.geneProb);

      while (genetics.population.length < genetics.settings.populationsize) {
        // fill up with new random one
        this.addChild(genetics, this.functions.seed());
      }
      let pickDepth = genetics.population.length; // limit picks to parents from curentt before (excluding newly added)

      for (let p = 0; p < genetics.tuning.newkids.val; p++) {
        pickDepth = genetics.population.length * genetics.tuning.pickdepth.val;
        const doCross = Math.random() < genetics.tuning.crossover.val; // probability for crossover
        const doMutate = Math.random() < genetics.tuning.mutate.val; // mutate additionaly to crossover?
        if (doCross) {
          const [mother, father] = this.pickN(2, genetics.population, pickDepth);
          let [son, daughter] = this.functions.crossover(mother, father, master);
          if (doMutate) {
            this.functions.mutate(son, master); // mutate in-place
            this.functions.mutate(daughter, master); // mutate in-place
          }
          this.addChild(genetics, son);
          this.addChild(genetics, daughter);
        } else {
          // no crossover, do at least mutate or of not then geneate new random child
          if (doMutate) {
            const existing = this.functions.pick(genetics.population, pickDepth);
            let newChild = [].concat(existing);
            this.functions.mutate(newChild, master); // mutate in-place
            this.addChild(genetics, newChild);
          } else {
            // at least create a new random child then
            this.addChild(genetics, this.functions.seed());
          }
        }
      }
      return genetics.population;
    }

    this.loadFunctions = (serfunctions) => {
      this.functions = this.deserialise(serfunctions);
      return true;
    };

    this.setData = (data) => {
        this.dataset = data;
        return true;
    };

    this.fns = {
        LOADFNS: this.loadFunctions,
        EVOLVE: this.evolve
    };

    this.sendMessage = (type, payload) => {
      postMessage(
        {
          type: type,
          payload: payload
        }
      );
    };

    this.sendUpdate = (upd) => {
      this.sendMessage('U', upd);
    };

    this.sendResult = (res) => {
      this.sendMessage('R', res);
    };

    this.dispatch = function (msg) {
        const payload = msg.data.payload;
        const funcResult = fns[msg.data.fn](...payload);
        this.sendResult(funcResult);
    }

    // all code here
    console.log('Worker started.');
    onmessage = this.dispatch;
}

class Tune {
  lastDirection = 0;
  touched = false;

  constructor (initial, min, max) {
    this.initial = initial;
    this.val = initial;
    this.min = min;
    this.max = max;
    this.lastDirection = (max - min) / 10; // try with 10% change in the beginning
  }

  valueOf() {
    return this.val;
  }
};

class Genetic {
  settings = {
    maximize: false,
    maxgenerations: 100,
    populationsize: 1000,
  };
  tuning = {
    fading: new Tune(0.5, 0.01, 0.9),
    newkids: new Tune(250, 10, 1000),
    mutate: new Tune(0.3, 0.1, 1.0),
    crossover: new Tune(0.9, 0.1, 1.0),
    pickdepth: new Tune(0.9, 0.1, 1.0)
  };
  population = [];
  geneProb = [];


  constructor (newsettings, newtuning) {
    // only set the ones that are provided
    for (const key in newsettings) {
      this.settings[key] = newsettings[key];
    }
    for (const key in newtuning) {
      this.tuning[key] = newtuning[key];
    }

    console.assert('genelength' in newsettings);
    const len = this.settings.genelength;
    // initially fill the rank to all equal
    for (let i = 0; i < len; i++) {
      this.geneProb.push(1); // all same probability
    }

  }

}


const maxWorkers = navigator.hardwareConcurrency || 4;

class BackgroundTask {
    _worker = null;
    _num;

    constructor (workerNum) {
        this._num = workerNum;
        this._worker = new Worker(URL.createObjectURL(new Blob(["("+worker_function.toString()+")()"], {type: 'text/javascript'})));
    }

    workerFunctionCall(fnName, args) {
        return new Promise((resolve, reject) => {
            // wait for a message and resolve
            this._worker.onmessage = (msg) => {
              switch (msg.data.type) {
                case 'U': // update
                  break;
                case 'R': // result
                  resolve(msg.data.payload);
                  break;
              }

            };
            // if we get an error, reject
            this._worker.onerror = reject;
            // post a message to the worker
            this._worker.postMessage({ fn: fnName, payload: args });
        });
    }
}

class Workers {
    runningWorkers = [];

    constructor () {
        for (let w = 0; w < maxWorkers; w++) {
            this.runningWorkers.push(new BackgroundTask(w));
        }
    }

    async distribute (fnCall, dataset, ...args) {
        const promises = this.runningWorkers.map( w => {
            const asyncWorkerPromise = w.workerFunctionCall(fnCall, [ dataset, ...args]);
            startIndex += chunk;
            return asyncWorkerPromise;
        });
        const segmentsResults = await Promise.all(promises);
        return segmentsResults;
    }

    async operation(fnName, ...args) {
        const promises = this.runningWorkers.map(w => w.workerFunctionCall(fnName, args));
        const segmentsResults = await Promise.all(promises);
        return segmentsResults.reduce((acc, arr) => acc.concat(arr), []);
    }

    serialise(obj) {
      return JSON.stringify(obj, function (key, value) {
				if (value instanceof Function || typeof value == "function") return "__func__:" + value.toString();
				if (value instanceof RegExp) return "__regex__:" + value;
				return value;
			});
    }

    async loadFunctions(functions) {

      const loaded = await this.operation('LOADFNS', this.serialise(functions))
      // make sure every single promise returns __true__
      return loaded.reduce((allAnd, result) => allAnd && result, true);
    }

    tuneProbabilities(population) {
      // population is ordered. The further we go, the better
      // the fitness gets (increasing/decreasing depending on min/max)
      const vectorDeviation = new Array(population[0].genes.length).fill(1); // start with all ones
      for (let i = 1; i < population.length; i++) {
        const curr = population[i].genes;
        const last = population[i-1].genes;
        const fitDiff = Math.abs(population[i].fitness - population[i-1].fitness);
        for (let g = 0; g < curr.length; g++) {
          // the difference in the same gene index is a rough indicator of
          // which gene changed. It's like to have had an affect on the computed
          // fitness, the larger the fitness difference is.
          vectorDeviation[i] += fitDiff * Math.abs(curr[g] - last[g]);
        }
      }
      return vectorDeviation;
    }

    /**
    * Takes to number arrays and slightly moves __base__ towards __drift__.
    * @param base The array we use as basis
    * @param fade Value between 0..1 describing how many % of new to consider
    * @param drift The array with new values to take into consideration
    */
    fade (base, fade, drift) {
      for (let i = 0; i < base.length; i++) {
        base[i] = base[i] * (1.0 - fade) + drift[i] * fade;
      }
    }

    tuneStop (tuneVar, speedDiff, speedOverall) {
      if (speedDiff > speedOverall / 10) {
        // significant increase
        // had a positive effect. Keep it!
        return true;
      } else {
        // was not so good. Revert.
        tuneVar.lastDirection = -tuneVar.lastDirection;
        tuneVar.val += tuneVar.lastDirection; // go back to before
        return false;
      }
    }

    tuneStart (tuneVar) {
      tuneVar.val += tuneVar.lastDirection;
      if (tuneVar.val < tuneVar.min) tuneVar.val = tuneVar.min;
      if (tuneVar.val > tuneVar.max) tuneVar.val = tuneVar.max;
      tuneVar.lastDirection *= 0.9;
    }

    tuneDebug (tuning) {
      let debugStr = 'Tuning: ';
      for (const t in tuning) {
        const tuneVar = tuning[t];
        debugStr += `${t}:${tuneVar.val}, `;
      }
      console.log(debugStr);
    }

    /**
     * Tunes the variables to increase speed.
     * @param {Number} speedDiff Valua indicating speed increase (+) or decrease (-)
     */
    tuneVariables (tuning, speedDiff, speedOverall) {
      // tuning       contains all the variables that can be potentially tuned.
      // speedDiff    is the result of the last round and signals either an
      //              increase in speed (>0) or decrease in speed (<0)
      // speedOverall is the average speed so far. Good relative reference to
      //              judge speedDiff better
      let suggest = null;
      for (const t in tuning) {
        const tuneVar = tuning[t];
        if (tuneVar.touched) {
          // This was the tuning of the last round. Check result
          if (this.tuneStop(tuneVar, speedDiff, speedOverall)) {
            // was successful tune -> go on!
            suggest = t;
          }
          tuneVar.touched = false; // reset
        }
      }

      let newT = null;
      if (suggest) {
        newT = suggest;
      } else {
        // select a random new one
        const allTuningNames = Object.keys(tuning);
        const rndIdx = Math.floor(Math.random() * allTuningNames.length);
        newT = allTuningNames[rndIdx];
      }
      tuning[newT].touched = true; // let the fun begin ...
      this.tuneStart(tuning[newT]);
      this.tuneDebug(tuning);
    }

    async evolution(parameters) {
      const allgood = await this.loadFunctions(parameters);
      if (allgood !== true) {
        console.log('Error setting parameters. Aborting');
        return null;
      }
      const genetic = new Genetic(parameters.settings, parameters.tuning);
      const perfBeginning = performance.now();
      let firstFitness = null;
      let lastFitness = null;
      let prevSpeed = 0;

      for (let generation = 0; generation < parameters.settings.maxgenerations; generation++) {
        const perfOne = performance.now();
        const newGenerations = await this.operation('EVOLVE', genetic);
        const perfOneTime = performance.now() - perfOne;
        const sorted = parameters.settings.maximize ? newGenerations.sort((a,b) => b.fitness - a.fitness) : newGenerations.sort((a,b) => a.fitness - b.fitness);

        // only keep the population size
        genetic.population = sorted.slice(0, parameters.settings.populationsize);

        const bestFitness = genetic.population[0].fitness;
        if ((parameters.settings.solutionfitness !== undefined) && (bestFitness == parameters.settings.solutionfitness)) {
          // we actually found an accurate solution earlier
          break;
        }

        const overallTime = performance.now() - perfBeginning;
        let speedOverall = -1;
        let speedCurrent = 0;
        if (firstFitness !== null) {
          const fitDiffOverall = Math.abs(bestFitness - firstFitness);
          speedOverall = fitDiffOverall / overallTime;
        }
        if ((lastFitness !== null) && (lastFitness !== bestFitness)) {
          const fitDiffCurrent = Math.abs(bestFitness - lastFitness);
          speedCurrent = fitDiffCurrent / perfOneTime;
          // tune variables if we know the current speed
          if (speedOverall > 0) {
            this.tuneVariables(genetic.tuning, speedCurrent - prevSpeed, speedOverall);
          }
          prevSpeed = speedCurrent;
        }

        parameters.notify(generation, genetic.population[0], speedOverall, speedCurrent);

        // keep statistics up to date
        if (firstFitness === null) {
          firstFitness = bestFitness;
        }
        lastFitness = bestFitness;

        // tune gene probabilities
        this.fade(genetic.geneProb, genetic.tuning.fading.val, this.tuneProbabilities(genetic.population));
      }
      return genetic.population;
    }

}

const Concurrency = new Workers();
