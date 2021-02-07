'use strict';

class PicGenetic {

  GeneMin = 0;
  GeneMax = 200;
  GeneSpectrum = this.GeneMax - this.GeneMin;

  settings = {
    genelength: 100,
    populationsize: 1000,
    maxgenerations: 1000,
    solutionfitness: 0
  };

  tuning = {
    geneshift: new Tune(10, 2, 50),
    geneflips: new Tune(10, 2, 50),
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

  getPixel = (imgData, w, x, y) => {
    const index = (w * y + x) * 4;
    const r = imgData.data[index]
    const g = imgData.data[index + 1];
    const b = imgData.data[index + 2];

    return [r, g, b];
  };

  mergeColors = (imgData, w, points) => {
    const merged = [0, 0, 0];
    for (const p of points) {
      const rgb = this.getPixel(imgData, w, p[0], p[1]);
      merged[0] += Math.floor(rgb[0] / points.length);
      merged[1] += Math.floor(rgb[1] / points.length);
      merged[2] += Math.floor(rgb[2] / points.length);
    }
    return merged;
  };

  drawPolygon = (ctx, orgImage, points, w) => {
    const mix = this.mergeColors(orgImage, w, points);
    
    ctx.fillStyle = `rgb(${mix[0]},${mix[1]},${mix[2]})`;
  	ctx.beginPath();
  	for (const p of points) {
  		ctx.lineTo(p[0], p[1]);
  	}
  	ctx.closePath();
  	ctx.fill();
  };

  drawGenomeImage = (genome, width, height, orgImage) => {
  	if (!this.ctx) {
  		const canvas =  new OffscreenCanvas(width, height);
  		this.ctx = canvas.getContext('2d');
  	}
  	const ctx = this.ctx;
  	ctx.fillStyle = '#ffffff';
  	ctx.fillRect(0,0,width,height); // initially black

    // get scaling
    const sx = width / this.GeneMax;
    const sy = height / this.GeneMax;

    // convert gene sequence (x1, y1, x2, y2, ...) to points: [ [x1, y1], [x2, y2], ...]
    const points = [];
    for (let i = 0; i < genome.length; i+=2) {
      points.push([
        genome[i] * sx,
        genome[i+1] * sy
      ]);
    }

    // get the triangle indices into points array
    const delaunay = Delaunator.from(points);

    // and convert them to actual triangles
    const triangles = delaunay.triangles;
    for (let i = 0; i < triangles.length; i += 3) {
      const t = [
          points[triangles[i]],
          points[triangles[i + 1]],
          points[triangles[i + 2]]
      ];
      this.drawPolygon(ctx, orgImage, t, width);
    }

  	return ctx.getImageData(0, 0, width, height);
  };

  imgDiff = (img1, img2) => {
  	const w = img1.width;
  	const h = img1.height;

  	let totalDiff = 0;

  	for (let x = 0; x < w; x+=2) {
  		for (let y = 0; y < h; y+=2) {
  			const index = (w * y + x) * 4;
  			const r1 = img1.data[index]
  			const g1 = img1.data[index + 1];
  			const b1 = img1.data[index + 2];
  			const r2 = img2.data[index]
  			const g2 = img2.data[index + 1];
  			const b2 = img2.data[index + 2];
  			const gray1 = (r1+g1+b1)/3;
  			const gray2 = (r2+g2+b2)/3;

  			const r = Math.abs(r1 - r2);
  			const g = Math.abs(g1 - g2);
  			const b = Math.abs(b1 - b2);
  			const pixelDiff = (r*r + g*g + b*b) / 1000;

  			totalDiff += pixelDiff;
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
    const pic = this.drawGenomeImage(sequence, this.width, this.height, this.imgData);
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
    const img = this.drawGenomeImage(bestSequence.genes, this.imgData.width, this.imgData.height, this.imgData);
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
