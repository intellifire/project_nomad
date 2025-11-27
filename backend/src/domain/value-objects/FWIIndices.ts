/**
 * Fire danger rating levels based on FWI value
 */
export enum FireDangerRating {
  Low = 'Low',
  Moderate = 'Moderate',
  High = 'High',
  VeryHigh = 'Very High',
  Extreme = 'Extreme',
}

/**
 * Immutable value object representing Canadian Fire Weather Index (FWI) system components.
 *
 * The FWI System provides numerical ratings of fire weather conditions and
 * fire behavior potential. It consists of six components:
 *
 * Fuel Moisture Codes (track moisture content):
 * - FFMC: Fine Fuel Moisture Code (surface litter, 1-2cm depth)
 * - DMC: Duff Moisture Code (loosely compacted organic layer, 5-10cm)
 * - DC: Drought Code (deep compact organic layer, 10-20cm)
 *
 * Fire Behavior Indices (rate fire behavior potential):
 * - ISI: Initial Spread Index (combines wind and FFMC)
 * - BUI: Buildup Index (combines DMC and DC)
 * - FWI: Fire Weather Index (combines ISI and BUI)
 */
export class FWIIndices {
  /** Fine Fuel Moisture Code (0-101, higher = drier fine fuels) */
  readonly ffmc: number;

  /** Duff Moisture Code (0-∞, typically 0-500, higher = drier duff layer) */
  readonly dmc: number;

  /** Drought Code (0-∞, typically 0-1000, higher = drier deep organic) */
  readonly dc: number;

  /** Initial Spread Index (0-∞, fire spread potential) */
  readonly isi: number;

  /** Buildup Index (0-∞, fuel available for combustion) */
  readonly bui: number;

  /** Fire Weather Index (0-∞, overall fire intensity) */
  readonly fwi: number;

  constructor(ffmc: number, dmc: number, dc: number, isi: number, bui: number, fwi: number) {
    this.validateIndices(ffmc, dmc, dc, isi, bui, fwi);

    this.ffmc = ffmc;
    this.dmc = dmc;
    this.dc = dc;
    this.isi = isi;
    this.bui = bui;
    this.fwi = fwi;
  }

  /**
   * Creates FWIIndices from an object
   */
  static from(indices: {
    ffmc: number;
    dmc: number;
    dc: number;
    isi: number;
    bui: number;
    fwi: number;
  }): FWIIndices {
    return new FWIIndices(
      indices.ffmc,
      indices.dmc,
      indices.dc,
      indices.isi,
      indices.bui,
      indices.fwi
    );
  }

  /**
   * Creates default spring startup indices (typical Canadian values)
   */
  static springStartup(): FWIIndices {
    return new FWIIndices(85, 6, 15, 0, 0, 0);
  }

  /**
   * Gets the fire danger rating based on FWI value
   */
  getFireDangerRating(): FireDangerRating {
    if (this.fwi < 5) return FireDangerRating.Low;
    if (this.fwi < 10) return FireDangerRating.Moderate;
    if (this.fwi < 20) return FireDangerRating.High;
    if (this.fwi < 30) return FireDangerRating.VeryHigh;
    return FireDangerRating.Extreme;
  }

  /**
   * Checks if conditions are favorable for fire spread
   */
  isFavorableForSpread(): boolean {
    return this.ffmc >= 70 && this.isi >= 2;
  }

  /**
   * Checks if drought conditions exist
   */
  isDrought(): boolean {
    return this.dc >= 300;
  }

  /**
   * Checks equality with another FWIIndices object
   */
  equals(other: FWIIndices): boolean {
    return (
      this.ffmc === other.ffmc &&
      this.dmc === other.dmc &&
      this.dc === other.dc &&
      this.isi === other.isi &&
      this.bui === other.bui &&
      this.fwi === other.fwi
    );
  }

  /**
   * Checks approximate equality within a tolerance
   */
  approximatelyEquals(other: FWIIndices, tolerance: number = 0.1): boolean {
    return (
      Math.abs(this.ffmc - other.ffmc) <= tolerance &&
      Math.abs(this.dmc - other.dmc) <= tolerance &&
      Math.abs(this.dc - other.dc) <= tolerance &&
      Math.abs(this.isi - other.isi) <= tolerance &&
      Math.abs(this.bui - other.bui) <= tolerance &&
      Math.abs(this.fwi - other.fwi) <= tolerance
    );
  }

  /**
   * Converts to plain object
   */
  toObject(): {
    ffmc: number;
    dmc: number;
    dc: number;
    isi: number;
    bui: number;
    fwi: number;
  } {
    return {
      ffmc: this.ffmc,
      dmc: this.dmc,
      dc: this.dc,
      isi: this.isi,
      bui: this.bui,
      fwi: this.fwi,
    };
  }

  /**
   * Returns a formatted string representation
   */
  toString(): string {
    return `FFMC: ${this.ffmc.toFixed(1)}, DMC: ${this.dmc.toFixed(1)}, DC: ${this.dc.toFixed(1)}, ISI: ${this.isi.toFixed(1)}, BUI: ${this.bui.toFixed(1)}, FWI: ${this.fwi.toFixed(1)}`;
  }

  /**
   * Returns a summary string with danger rating
   */
  toSummary(): string {
    return `FWI: ${this.fwi.toFixed(1)} (${this.getFireDangerRating()})`;
  }

  private validateIndices(
    ffmc: number,
    dmc: number,
    dc: number,
    isi: number,
    bui: number,
    fwi: number
  ): void {
    if (ffmc < 0 || ffmc > 101) {
      throw new Error(`FFMC must be between 0 and 101, got ${ffmc}`);
    }
    if (dmc < 0) {
      throw new Error(`DMC cannot be negative, got ${dmc}`);
    }
    if (dc < 0) {
      throw new Error(`DC cannot be negative, got ${dc}`);
    }
    if (isi < 0) {
      throw new Error(`ISI cannot be negative, got ${isi}`);
    }
    if (bui < 0) {
      throw new Error(`BUI cannot be negative, got ${bui}`);
    }
    if (fwi < 0) {
      throw new Error(`FWI cannot be negative, got ${fwi}`);
    }
  }
}
