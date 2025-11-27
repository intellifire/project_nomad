/**
 * Fire Weather Index (FWI) system components
 *
 * The Canadian FWI System provides numerical ratings for fire weather conditions.
 */
export interface FWIComponents {
  /** Fine Fuel Moisture Code (0-101, higher = drier) */
  readonly ffmc: number;
  /** Duff Moisture Code (0-∞, typically 0-500, higher = drier) */
  readonly dmc: number;
  /** Drought Code (0-∞, typically 0-1000, higher = drier) */
  readonly dc: number;
  /** Initial Spread Index (0-∞, combines wind and FFMC) */
  readonly isi: number;
  /** Buildup Index (0-∞, combines DMC and DC) */
  readonly bui: number;
  /** Fire Weather Index (0-∞, combines ISI and BUI) */
  readonly fwi: number;
}

/**
 * Properties for creating WeatherData
 */
export interface WeatherDataProps {
  /** Observation timestamp */
  readonly timestamp: Date;
  /** Temperature in Celsius */
  readonly temperature: number;
  /** Relative humidity (0-100) */
  readonly relativeHumidity: number;
  /** Wind speed in km/h */
  readonly windSpeed: number;
  /** Wind direction in degrees (0-360, 0=North) */
  readonly windDirection: number;
  /** Precipitation in mm */
  readonly precipitation: number;
  /** FWI components (optional, may be calculated later) */
  readonly fwi?: FWIComponents;
}

/**
 * Domain entity representing weather observation data with FWI components.
 *
 * Weather data is essential for fire behavior prediction, providing the
 * atmospheric conditions that drive fire spread calculations.
 */
export class WeatherData {
  /** Observation timestamp */
  readonly timestamp: Date;

  /** Temperature in Celsius */
  readonly temperature: number;

  /** Relative humidity (0-100) */
  readonly relativeHumidity: number;

  /** Wind speed in km/h */
  readonly windSpeed: number;

  /** Wind direction in degrees (0-360, 0=North) */
  readonly windDirection: number;

  /** Precipitation in mm */
  readonly precipitation: number;

  /** FWI system components */
  readonly fwi: FWIComponents | null;

  constructor(props: WeatherDataProps) {
    this.validateProps(props);

    this.timestamp = props.timestamp;
    this.temperature = props.temperature;
    this.relativeHumidity = props.relativeHumidity;
    this.windSpeed = props.windSpeed;
    this.windDirection = props.windDirection;
    this.precipitation = props.precipitation;
    this.fwi = props.fwi ?? null;
  }

  /**
   * Creates a new WeatherData with FWI components added
   */
  withFWI(fwi: FWIComponents): WeatherData {
    return new WeatherData({
      timestamp: this.timestamp,
      temperature: this.temperature,
      relativeHumidity: this.relativeHumidity,
      windSpeed: this.windSpeed,
      windDirection: this.windDirection,
      precipitation: this.precipitation,
      fwi,
    });
  }

  /**
   * Checks if FWI has been calculated for this observation
   */
  hasFWI(): boolean {
    return this.fwi !== null;
  }

  /**
   * Gets the fire danger rating based on FWI value
   */
  getFireDangerRating(): string | null {
    if (!this.fwi) return null;

    const fwiValue = this.fwi.fwi;
    if (fwiValue < 5) return 'Low';
    if (fwiValue < 10) return 'Moderate';
    if (fwiValue < 20) return 'High';
    if (fwiValue < 30) return 'Very High';
    return 'Extreme';
  }

  /**
   * Converts to FireSTARR weather CSV row format
   * Format: YYYY,MM,DD,HH,temp,rh,ws,wd,precip,ffmc,dmc,dc,isi,bui,fwi
   */
  toFireSTARRCsvRow(): string {
    if (!this.fwi) {
      throw new Error('Cannot export to FireSTARR format without FWI components');
    }

    const d = this.timestamp;
    return [
      d.getUTCFullYear(),
      d.getUTCMonth() + 1,
      d.getUTCDate(),
      d.getUTCHours(),
      this.temperature.toFixed(1),
      this.relativeHumidity.toFixed(0),
      this.windSpeed.toFixed(1),
      this.windDirection.toFixed(0),
      this.precipitation.toFixed(1),
      this.fwi.ffmc.toFixed(1),
      this.fwi.dmc.toFixed(1),
      this.fwi.dc.toFixed(1),
      this.fwi.isi.toFixed(1),
      this.fwi.bui.toFixed(1),
      this.fwi.fwi.toFixed(1),
    ].join(',');
  }

  /**
   * Validates all input properties
   */
  private validateProps(props: WeatherDataProps): void {
    if (!(props.timestamp instanceof Date) || isNaN(props.timestamp.getTime())) {
      throw new Error('Invalid timestamp');
    }

    if (props.temperature < -70 || props.temperature > 60) {
      throw new Error(`Temperature ${props.temperature}°C is outside valid range (-70 to 60)`);
    }

    if (props.relativeHumidity < 0 || props.relativeHumidity > 100) {
      throw new Error(`Relative humidity ${props.relativeHumidity}% must be between 0 and 100`);
    }

    if (props.windSpeed < 0 || props.windSpeed > 200) {
      throw new Error(`Wind speed ${props.windSpeed} km/h must be between 0 and 200`);
    }

    if (props.windDirection < 0 || props.windDirection > 360) {
      throw new Error(`Wind direction ${props.windDirection}° must be between 0 and 360`);
    }

    if (props.precipitation < 0) {
      throw new Error(`Precipitation ${props.precipitation} mm cannot be negative`);
    }

    if (props.fwi) {
      this.validateFWI(props.fwi);
    }
  }

  /**
   * Validates FWI components
   */
  private validateFWI(fwi: FWIComponents): void {
    if (fwi.ffmc < 0 || fwi.ffmc > 101) {
      throw new Error(`FFMC ${fwi.ffmc} must be between 0 and 101`);
    }
    if (fwi.dmc < 0) {
      throw new Error(`DMC ${fwi.dmc} cannot be negative`);
    }
    if (fwi.dc < 0) {
      throw new Error(`DC ${fwi.dc} cannot be negative`);
    }
    if (fwi.isi < 0) {
      throw new Error(`ISI ${fwi.isi} cannot be negative`);
    }
    if (fwi.bui < 0) {
      throw new Error(`BUI ${fwi.bui} cannot be negative`);
    }
    if (fwi.fwi < 0) {
      throw new Error(`FWI ${fwi.fwi} cannot be negative`);
    }
  }
}
