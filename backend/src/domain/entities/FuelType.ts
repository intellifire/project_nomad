/**
 * Canadian Forest Fire Behavior Prediction (FBP) System fuel types
 *
 * These are the standard fuel type codes used in Canadian fire modeling.
 */
export enum FuelTypeCode {
  // Conifer group
  C1 = 'C-1',  // Spruce-Lichen Woodland
  C2 = 'C-2',  // Boreal Spruce
  C3 = 'C-3',  // Mature Jack or Lodgepole Pine
  C4 = 'C-4',  // Immature Jack or Lodgepole Pine
  C5 = 'C-5',  // Red and White Pine
  C6 = 'C-6',  // Conifer Plantation
  C7 = 'C-7',  // Ponderosa Pine - Douglas-Fir

  // Deciduous group
  D1 = 'D-1',  // Leafless Aspen
  D2 = 'D-2',  // Green Aspen (with BUI effect)

  // Mixedwood group
  M1 = 'M-1',  // Boreal Mixedwood - Leafless
  M2 = 'M-2',  // Boreal Mixedwood - Green
  M3 = 'M-3',  // Dead Balsam Fir Mixedwood - Leafless
  M4 = 'M-4',  // Dead Balsam Fir Mixedwood - Green

  // Slash group
  S1 = 'S-1',  // Jack or Lodgepole Pine Slash
  S2 = 'S-2',  // White Spruce - Balsam Slash
  S3 = 'S-3',  // Coastal Cedar - Hemlock - Douglas-Fir Slash

  // Open group
  O1a = 'O-1a', // Matted Grass
  O1b = 'O-1b', // Standing Grass

  // Non-fuel
  NonFuel = 'NF',   // Non-fuel
  Water = 'WA',     // Water
  Urban = 'UR',     // Urban/Developed
}

/**
 * Properties for creating a FuelType
 */
export interface FuelTypeProps {
  /** FBP fuel type code */
  readonly code: FuelTypeCode;
  /** Display name */
  readonly name: string;
  /** Description of the fuel type */
  readonly description?: string;
  /** Whether this fuel type can burn */
  readonly burnable: boolean;
  /** Percent conifer (0-100) for mixedwood types */
  readonly percentConifer?: number;
  /** Percent dead fir (0-100) for M3/M4 types */
  readonly percentDeadFir?: number;
  /** Grass curing percentage (0-100) for grass types */
  readonly grassCuring?: number;
}

/**
 * Domain entity representing a Canadian FBP fuel type.
 *
 * Fuel types determine fire behavior characteristics and are a critical
 * input to fire spread prediction models.
 */
export class FuelType {
  /** FBP fuel type code */
  readonly code: FuelTypeCode;

  /** Display name */
  readonly name: string;

  /** Description of the fuel type */
  readonly description: string;

  /** Whether this fuel type can burn */
  readonly burnable: boolean;

  /** Percent conifer (0-100) for mixedwood types */
  readonly percentConifer: number | null;

  /** Percent dead fir (0-100) for M3/M4 types */
  readonly percentDeadFir: number | null;

  /** Grass curing percentage (0-100) for grass types */
  readonly grassCuring: number | null;

  constructor(props: FuelTypeProps) {
    this.validateProps(props);

    this.code = props.code;
    this.name = props.name;
    this.description = props.description ?? '';
    this.burnable = props.burnable;
    this.percentConifer = props.percentConifer ?? null;
    this.percentDeadFir = props.percentDeadFir ?? null;
    this.grassCuring = props.grassCuring ?? null;
  }

  /**
   * Creates standard fuel type definitions
   */
  static getStandardFuelType(code: FuelTypeCode): FuelType {
    const definitions: Record<FuelTypeCode, FuelTypeProps> = {
      [FuelTypeCode.C1]: { code: FuelTypeCode.C1, name: 'Spruce-Lichen Woodland', burnable: true },
      [FuelTypeCode.C2]: { code: FuelTypeCode.C2, name: 'Boreal Spruce', burnable: true },
      [FuelTypeCode.C3]: { code: FuelTypeCode.C3, name: 'Mature Jack or Lodgepole Pine', burnable: true },
      [FuelTypeCode.C4]: { code: FuelTypeCode.C4, name: 'Immature Jack or Lodgepole Pine', burnable: true },
      [FuelTypeCode.C5]: { code: FuelTypeCode.C5, name: 'Red and White Pine', burnable: true },
      [FuelTypeCode.C6]: { code: FuelTypeCode.C6, name: 'Conifer Plantation', burnable: true },
      [FuelTypeCode.C7]: { code: FuelTypeCode.C7, name: 'Ponderosa Pine - Douglas-Fir', burnable: true },
      [FuelTypeCode.D1]: { code: FuelTypeCode.D1, name: 'Leafless Aspen', burnable: true },
      [FuelTypeCode.D2]: { code: FuelTypeCode.D2, name: 'Green Aspen', burnable: true },
      [FuelTypeCode.M1]: { code: FuelTypeCode.M1, name: 'Boreal Mixedwood - Leafless', burnable: true, percentConifer: 50 },
      [FuelTypeCode.M2]: { code: FuelTypeCode.M2, name: 'Boreal Mixedwood - Green', burnable: true, percentConifer: 50 },
      [FuelTypeCode.M3]: { code: FuelTypeCode.M3, name: 'Dead Balsam Fir Mixedwood - Leafless', burnable: true, percentConifer: 50, percentDeadFir: 30 },
      [FuelTypeCode.M4]: { code: FuelTypeCode.M4, name: 'Dead Balsam Fir Mixedwood - Green', burnable: true, percentConifer: 50, percentDeadFir: 30 },
      [FuelTypeCode.S1]: { code: FuelTypeCode.S1, name: 'Jack or Lodgepole Pine Slash', burnable: true },
      [FuelTypeCode.S2]: { code: FuelTypeCode.S2, name: 'White Spruce - Balsam Slash', burnable: true },
      [FuelTypeCode.S3]: { code: FuelTypeCode.S3, name: 'Coastal Cedar - Hemlock - Douglas-Fir Slash', burnable: true },
      [FuelTypeCode.O1a]: { code: FuelTypeCode.O1a, name: 'Matted Grass', burnable: true, grassCuring: 80 },
      [FuelTypeCode.O1b]: { code: FuelTypeCode.O1b, name: 'Standing Grass', burnable: true, grassCuring: 80 },
      [FuelTypeCode.NonFuel]: { code: FuelTypeCode.NonFuel, name: 'Non-fuel', burnable: false },
      [FuelTypeCode.Water]: { code: FuelTypeCode.Water, name: 'Water', burnable: false },
      [FuelTypeCode.Urban]: { code: FuelTypeCode.Urban, name: 'Urban/Developed', burnable: false },
    };

    return new FuelType(definitions[code]);
  }

  /**
   * Checks if this is a conifer fuel type
   */
  isConifer(): boolean {
    return this.code.startsWith('C-');
  }

  /**
   * Checks if this is a deciduous fuel type
   */
  isDeciduous(): boolean {
    return this.code.startsWith('D-');
  }

  /**
   * Checks if this is a mixedwood fuel type
   */
  isMixedwood(): boolean {
    return this.code.startsWith('M-');
  }

  /**
   * Checks if this is a slash fuel type
   */
  isSlash(): boolean {
    return this.code.startsWith('S-');
  }

  /**
   * Checks if this is a grass fuel type
   */
  isGrass(): boolean {
    return this.code.startsWith('O-');
  }

  /**
   * Creates a new FuelType with updated percent conifer (for mixedwood types)
   */
  withPercentConifer(percentConifer: number): FuelType {
    if (!this.isMixedwood()) {
      throw new Error('Percent conifer only applies to mixedwood fuel types');
    }
    return new FuelType({
      code: this.code,
      name: this.name,
      description: this.description,
      burnable: this.burnable,
      percentConifer,
      percentDeadFir: this.percentDeadFir ?? undefined,
      grassCuring: this.grassCuring ?? undefined,
    });
  }

  /**
   * Creates a new FuelType with updated grass curing (for grass types)
   */
  withGrassCuring(grassCuring: number): FuelType {
    if (!this.isGrass()) {
      throw new Error('Grass curing only applies to grass fuel types');
    }
    return new FuelType({
      code: this.code,
      name: this.name,
      description: this.description,
      burnable: this.burnable,
      percentConifer: this.percentConifer ?? undefined,
      percentDeadFir: this.percentDeadFir ?? undefined,
      grassCuring,
    });
  }

  /**
   * Validates input properties
   */
  private validateProps(props: FuelTypeProps): void {
    if (!props.name || props.name.trim().length === 0) {
      throw new Error('Fuel type name cannot be empty');
    }

    if (props.percentConifer !== undefined) {
      if (props.percentConifer < 0 || props.percentConifer > 100) {
        throw new Error(`Percent conifer ${props.percentConifer} must be between 0 and 100`);
      }
    }

    if (props.percentDeadFir !== undefined) {
      if (props.percentDeadFir < 0 || props.percentDeadFir > 100) {
        throw new Error(`Percent dead fir ${props.percentDeadFir} must be between 0 and 100`);
      }
    }

    if (props.grassCuring !== undefined) {
      if (props.grassCuring < 0 || props.grassCuring > 100) {
        throw new Error(`Grass curing ${props.grassCuring} must be between 0 and 100`);
      }
    }
  }
}
