'use strict';

class PicGenetic {

  GeneMin = 0;
  GeneMax = 200;
  GeneSpectrum = this.GeneMax - this.GeneMin;

  settings = {
    genelength: 300,
    populationsize: 1000,
    maxgenerations: 1000,
    solutionfitness: 0,
    chunksize: 11
  };

  tuning = {
    geneshift: new Tune(10, 2, 20),
    geneflips: new Tune(10, 2, 20),
    newkids: new Tune(250, 10, 1000),
    mutate: new Tune(0.3, 0.1, 1.0),
    crossover: new Tune(0.9, 0.1, 1.0)
  };

  constructor (canvas, imgData) {
    this.canvas = canvas;
    this.imgData = imgData;
    this.width = imgData.width;
    this.height = imgData.height;
  }

  drawFilledPoly = (ctx, arr, width, height) => {
    if (arr.length < 6) {
      // we need at least color, x, y, and 3 points
      return;
    }

    const sx = this.GeneMax / width;
    const sy = this.GeneMax / height;

    const color = arr[0];

    /*
  	// color is 12 bit value
  	const r = ((color & 0xF00) >> 8);
  	const g = ((color & 0x0F0) >> 4);
  	const b = (color & 0x00F);

  	ctx.fillStyle = `rgb(${r<<4},${g<<4},${b<<4})`;
    */
    const r = color * 255 / this.GeneMax;
    ctx.fillStyle = `rgb(${r},${r},${r})`;
  	ctx.beginPath();
  	let centerx = arr[1] / sx;
  	let centery = arr[2] / sy;
    const points = arr.slice(3);
    const maxIndex = points.length;
  	for (let i = 0; i < maxIndex; i ++) {
  		const length = points[i] / sx / 2;
  		const angle = Math.PI * 2 / maxIndex * i;
  		const x = centerx + Math.sin(angle) * length;
  		const y = centery + Math.cos(angle) * length;
  		ctx.lineTo(x,y);
  	}
  	ctx.closePath();
  	ctx.fill();
  };


  drawGenomeImage = (genome, width, height) => {
  	if (!this.ctx) {
  		const canvas =  new OffscreenCanvas(width, height);
  		this.ctx = canvas.getContext('2d');
  	}
  	const ctx = this.ctx;
  	ctx.fillStyle = '#000000';
  	ctx.fillRect(0,0,width,height); // initially black

    for (let i = 0, j = genome.length; i < j; i += this.settings.chunksize) {
      const chunk = genome.slice(i, i + this.settings.chunksize);
      this.drawFilledPoly(ctx, chunk, width, height);
    }

  	return ctx.getImageData(0, 0, width, height);
  };

  imgDiff = (img1, img2) => {
  	const w = img1.width;
  	const h = img1.height;

  	let totalDiff = 0;

  	for (let x = 0; x < w; x++) {
  		for (let y = 0; y < h; y++) {
  			var index = (w * y + x) * 4;
  			const r1 = img1.data[index]
  			const g1 = img1.data[index + 1];
  			const b1 = img1.data[index + 2];
  			const r2 = img2.data[index]
  			const g2 = img2.data[index + 1];
  			const b2 = img2.data[index + 2];
  			const gray1 = (r1+g1+b1)/3;
  			const gray2 = (r2+g2+b2)/3;

  			//const r = Math.abs(r1 - r2);
  			//const g = Math.abs(g1 - g2);
  			//const b = Math.abs(b1 - b2);
  			//const pixelDiff = (r*r + g*g + b*b) / 1000;

  			const pixelDiff = Math.abs(gray1-gray2);

  			totalDiff += (pixelDiff*pixelDiff)/255;//
  		}
  	}

    const sqrtDiff = Math.sqrt(totalDiff);
    return sqrtDiff;
  }


  /**
   * Eveluates the fitness of a given sequence of genes and returns the result as a number.
   * The number can either be greater for better fitness or lower, depending on the optimisation
   * strategy. The strategy is set using settings.maximise == true / false
   * @param {Array<Number>} sequence The gene sequence to judge
   */
  fitness = (sequence) => {
    const pic = this.drawGenomeImage(sequence, this.width, this.height);
    return this.imgDiff(pic, this.imgData);
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
  notify = (generation, bestSequence, speedOverall, speedCurrent) => {
    const img = this.drawGenomeImage(bestSequence.genes, this.imgData.width, this.imgData.height);
  	this.canvas.putImageData(img, 0, 0);
    console.log(`Current generation: ${generation}. Best fitness = ${bestSequence.fitness.toFixed(2)}, speed[O]: ${speedOverall}, speed[C]: ${speedCurrent}`);
  }
};

async function geneticImage(imgEl, imgData) {
	const ctx = imgEl.getContext('2d');
	const w = imgEl.width;
	const h = imgEl.height;

  const res = await Concurrency.evolution(new PicGenetic(ctx, imgData));
  console.log('Finished.');
  console.log(res);

}


async function start() {
  const resultImg = document.getElementById('canvas');
  const img = new Image();
  const f = document.getElementById("uploadimage").files[0];
  if (f) {
    const url = window.URL || window.webkitURL;
    const src = url.createObjectURL(f);

    img.src = src;
    img.onload = function() {
      var canvas = document.createElement('canvas');
      canvas.width = resultImg.width;
      canvas.height = resultImg.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, resultImg.width, resultImg.height);
      url.revokeObjectURL(src);
      var completeImage = ctx.getImageData(0, 0, resultImg.width, resultImg.height);
      geneticImage(resultImg, completeImage);
    }
  }
}
