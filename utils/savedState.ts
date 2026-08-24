import { APP_STATE_VERSION } from '../constants';
import { Bit, CurrencyCode, NormalizedSavedState, SavedRateSnapshot, ScenarioConfig, ThemeMode } from '../types';

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord => typeof value === 'object' && value !== null;
const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const isCurrency = (value: unknown): value is CurrencyCode => value === 'USD' || value === 'PHP';
const isDepthUnit = (value: unknown): value is 'm' | 'ft' => value === 'm' || value === 'ft';
const isTheme = (value: unknown): value is ThemeMode => value === 'light' || value === 'dark' || value === 'xmas' || value === 'sakura' || value === 'summer' || value === 'autumn';

const requireNumber = (value: unknown, field: string): number => {
    if (!isFiniteNumber(value)) throw new Error(`Invalid saved case: ${field} must be a finite number`);
    return value;
};

const validateParams = (value: unknown): NormalizedSavedState['params'] => {
    if (!isRecord(value)) throw new Error('Invalid saved case: params are required');
    return {
        operationCostPerDay: requireNumber(value.operationCostPerDay, 'params.operationCostPerDay'),
        tripSpeed: requireNumber(value.tripSpeed, 'params.tripSpeed'),
        standLength: requireNumber(value.standLength, 'params.standLength'),
        depthIn: requireNumber(value.depthIn, 'params.depthIn'),
        intervalToDrill: requireNumber(value.intervalToDrill, 'params.intervalToDrill'),
        circulatingHours: requireNumber(value.circulatingHours, 'params.circulatingHours'),
    };
};

const validateBits = (value: unknown): Bit[] => {
    if (!Array.isArray(value)) throw new Error('Invalid saved case: bits are required');
    return value.map((item, index) => {
        if (!isRecord(item) || typeof item.id !== 'string' || typeof item.name !== 'string') {
            throw new Error(`Invalid saved case: bits[${index}] is invalid`);
        }
        return {
            id: item.id,
            name: item.name,
            cost: requireNumber(item.cost, `bits[${index}].cost`),
            rop: requireNumber(item.rop, `bits[${index}].rop`),
            maxDistance: requireNumber(item.maxDistance, `bits[${index}].maxDistance`),
            color: typeof item.color === 'string' ? item.color : '#64748b',
            isActive: item.isActive === undefined ? undefined : Boolean(item.isActive),
            order: requireNumber(item.order, `bits[${index}].order`),
        };
    });
};

const validateScenarios = (value: unknown, validBitIds: Set<string>): ScenarioConfig[] => {
    if (!Array.isArray(value)) throw new Error('Invalid saved case: scenarios are required');
    return value.map((item, index) => {
        if (!isRecord(item) || typeof item.id !== 'string' || typeof item.name !== 'string' || !Array.isArray(item.bitSequence)) {
            throw new Error(`Invalid saved case: scenarios[${index}] is invalid`);
        }
        return {
            id: item.id,
            name: item.name,
            bitSequence: item.bitSequence.filter(entry => isRecord(entry) && typeof entry.bitId === 'string' && validBitIds.has(entry.bitId)).map(entry => ({
                bitId: entry.bitId as string,
                actualDistance: requireNumber(entry.actualDistance, `scenarios[${index}].bitSequence.actualDistance`),
                actualROP: entry.actualROP === undefined ? undefined : requireNumber(entry.actualROP, `scenarios[${index}].bitSequence.actualROP`),
                comment: typeof entry.comment === 'string' ? entry.comment : undefined,
                isRerun: entry.isRerun === undefined ? undefined : Boolean(entry.isRerun),
                maxDistanceOverride: entry.maxDistanceOverride === undefined ? undefined : requireNumber(entry.maxDistanceOverride, `scenarios[${index}].bitSequence.maxDistanceOverride`),
            })),
        };
    });
};

const validateRateSnapshot = (value: unknown): SavedRateSnapshot | null => {
    if (value === null || value === undefined) return null;
    if (!isRecord(value) || value.from !== 'USD' || value.to !== 'PHP' || !isFiniteNumber(value.rate) || value.rate <= 0) {
        throw new Error('Invalid saved case: exchange rate snapshot is invalid');
    }
    return {
        from: 'USD',
        to: 'PHP',
        rate: value.rate,
        rateDate: typeof value.rateDate === 'string' ? value.rateDate : null,
        fetchedAt: value.fetchedAt === null || value.fetchedAt === undefined ? null : requireNumber(value.fetchedAt, 'exchangeRate.fetchedAt'),
        source: value.source === 'api' || value.source === 'stale-cache' || value.source === 'fallback' || value.source === 'saved-case' ? value.source : 'saved-case',
    };
};

const getRateSnapshot = (state: UnknownRecord): SavedRateSnapshot | null => {
    if (state.exchangeRate !== undefined && isRecord(state.exchangeRate)) {
        return validateRateSnapshot(state.exchangeRate);
    }
    if (state.exchangeRate !== undefined && isFiniteNumber(state.exchangeRate)) {
        return validateRateSnapshot({
            from: 'USD',
            to: 'PHP',
            rate: state.exchangeRate,
            rateDate: typeof state.exchangeRateDate === 'string' ? state.exchangeRateDate : null,
            fetchedAt: state.exchangeRateFetchedAt ?? null,
            source: 'saved-case',
        });
    }
    if (state.exchangeRate !== undefined || state.exchangeRateValue !== undefined) throw new Error('Invalid saved case: exchange rate snapshot is invalid');
    return null;
};

export const migrateSavedState = (input: unknown): NormalizedSavedState => {
    if (!isRecord(input)) throw new Error('Invalid saved case: expected a JSON object');
    if (input.baseCurrency !== undefined && input.baseCurrency !== 'USD') {
        throw new Error('Unsupported saved case: only USD base currency is supported');
    }
    const bits = validateBits(input.bits);
    const params = validateParams(input.params);
    const scenarios = validateScenarios(input.scenarios, new Set(bits.map(bit => bit.id)));
    let displayCurrency = isCurrency(input.displayCurrency) ? input.displayCurrency : 'USD';
    const exchangeRate = getRateSnapshot(input);
    if (displayCurrency === 'PHP' && !exchangeRate) {
        if (input.version === '1.2') {
            throw new Error('Invalid saved case: PHP cases require an exchange rate snapshot');
        }
        displayCurrency = 'USD';
    }
    return {
        params,
        bits,
        scenarios,
        preferences: {
            theme: isTheme(input.theme) ? input.theme : 'xmas',
            depthUnit: isDepthUnit(input.depthUnit) ? input.depthUnit : 'm',
            compareSelections: Array.isArray(input.compareSelections) ? input.compareSelections.filter((id): id is string => typeof id === 'string') : [],
            isCompareMode: input.isCompareMode === true,
        },
        baseCurrency: 'USD',
        displayCurrency,
        exchangeRate,
    };
};

export const serializeSavedState = (state: NormalizedSavedState): UnknownRecord => ({
    params: state.params,
    bits: state.bits,
    scenarios: state.scenarios,
    theme: state.preferences.theme,
    depthUnit: state.preferences.depthUnit,
    compareSelections: state.preferences.compareSelections,
    isCompareMode: state.preferences.isCompareMode,
    baseCurrency: state.baseCurrency,
    displayCurrency: state.displayCurrency,
    exchangeRate: state.exchangeRate,
    version: APP_STATE_VERSION,
    timestamp: new Date().toISOString(),
});