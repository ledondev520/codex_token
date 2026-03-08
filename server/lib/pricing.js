const PRICING_BY_MODEL = {
  "gpt-5-codex": {
    inputPerMillion: 1.25,
    cachedInputPerMillion: 0.125,
    outputPerMillion: 10,
    sourceType: "official",
    sourceLabel: "OpenAI GPT-5-Codex",
    sourceUrl: "https://platform.openai.com/docs/models/gpt-5-codex/",
  },
  "gpt-5.1-codex": {
    inputPerMillion: 1.25,
    cachedInputPerMillion: 0.125,
    outputPerMillion: 10,
    sourceType: "official",
    sourceLabel: "OpenAI GPT-5.1-Codex",
    sourceUrl: "https://developers.openai.com/api/docs/models/gpt-5.1-codex",
  },
  "gpt-5.1-codex-max": {
    inputPerMillion: 1.25,
    cachedInputPerMillion: 0.125,
    outputPerMillion: 10,
    sourceType: "official",
    sourceLabel: "OpenAI Pricing",
    sourceUrl: "https://platform.openai.com/docs/pricing/",
  },
  "gpt-5.2-codex": {
    inputPerMillion: 1.75,
    cachedInputPerMillion: 0.175,
    outputPerMillion: 14,
    sourceType: "official",
    sourceLabel: "OpenAI Pricing",
    sourceUrl: "https://platform.openai.com/docs/pricing/",
  },
  "gpt-5.3-codex": {
    inputPerMillion: 1.75,
    cachedInputPerMillion: 0.175,
    outputPerMillion: 14,
    sourceType: "official",
    sourceLabel: "OpenAI GPT-5.3-Codex",
    sourceUrl: "https://developers.openai.com/api/docs/models/gpt-5.3-codex",
  },
  "gpt-5.4": {
    inputPerMillion: 2.5,
    cachedInputPerMillion: 0.25,
    outputPerMillion: 15,
    sourceType: "official",
    sourceLabel: "OpenAI GPT-5.4",
    sourceUrl: "https://developers.openai.com/api/docs/models/gpt-5.4",
  },
  "gpt-5": {
    inputPerMillion: 1.25,
    cachedInputPerMillion: 0.125,
    outputPerMillion: 10,
    sourceType: "official",
    sourceLabel: "OpenAI Pricing",
    sourceUrl: "https://platform.openai.com/docs/pricing/",
  },
  "gpt-5.1": {
    inputPerMillion: 1.25,
    cachedInputPerMillion: 0.125,
    outputPerMillion: 10,
    sourceType: "official",
    sourceLabel: "OpenAI Pricing",
    sourceUrl: "https://platform.openai.com/docs/pricing/",
  },
  "gpt-5.2": {
    inputPerMillion: 1.75,
    cachedInputPerMillion: 0.175,
    outputPerMillion: 14,
    sourceType: "official",
    sourceLabel: "OpenAI Pricing",
    sourceUrl: "https://platform.openai.com/docs/pricing/",
  },
  "gpt-5-mini": {
    inputPerMillion: 0.25,
    cachedInputPerMillion: 0.025,
    outputPerMillion: 2,
    sourceType: "official",
    sourceLabel: "OpenAI Pricing",
    sourceUrl: "https://platform.openai.com/docs/pricing/",
  },
  "gpt-5-nano": {
    inputPerMillion: 0.05,
    cachedInputPerMillion: 0.005,
    outputPerMillion: 0.4,
    sourceType: "official",
    sourceLabel: "OpenAI Pricing",
    sourceUrl: "https://platform.openai.com/docs/pricing/",
  },
  "gpt-5-pro": {
    inputPerMillion: 15,
    cachedInputPerMillion: null,
    outputPerMillion: 120,
    sourceType: "official",
    sourceLabel: "OpenAI Pricing",
    sourceUrl: "https://platform.openai.com/docs/pricing/",
  },
  "gpt-4.1": {
    inputPerMillion: 2,
    cachedInputPerMillion: 0.5,
    outputPerMillion: 8,
    sourceType: "official",
    sourceLabel: "OpenAI Pricing",
    sourceUrl: "https://platform.openai.com/docs/pricing/",
  },
  "gpt-4.1-mini": {
    inputPerMillion: 0.4,
    cachedInputPerMillion: 0.1,
    outputPerMillion: 1.6,
    sourceType: "official",
    sourceLabel: "OpenAI Pricing",
    sourceUrl: "https://platform.openai.com/docs/pricing/",
  },
};

function normalizeModelName(modelName) {
  if (!modelName) {
    return null;
  }

  const normalized = String(modelName).trim().toLowerCase();
  if (/^\d/.test(normalized)) {
    return `gpt-${normalized}`;
  }

  return normalized;
}

function getPricingForModel(modelName) {
  const normalizedModelName = normalizeModelName(modelName);
  if (!normalizedModelName) {
    return null;
  }

  const exactMatch = PRICING_BY_MODEL[normalizedModelName];
  if (exactMatch) {
    return {
      normalizedModelName,
      pricingModelName: normalizedModelName,
      ...exactMatch,
    };
  }

  if (normalizedModelName.endsWith("-spark")) {
    const baseModel = normalizedModelName.replace(/-spark$/, "");
    const basePricing = PRICING_BY_MODEL[baseModel];
    if (basePricing) {
      return {
        normalizedModelName,
        pricingModelName: baseModel,
        ...basePricing,
        sourceType: "inferred",
        sourceLabel: `${basePricing.sourceLabel}（按 spark 别名推断）`,
      };
    }
  }

  if (normalizedModelName.endsWith("-codex")) {
    const baseModel = normalizedModelName.replace(/-codex$/, "");
    const basePricing = PRICING_BY_MODEL[baseModel];
    if (basePricing) {
      return {
        normalizedModelName,
        pricingModelName: baseModel,
        ...basePricing,
        sourceType: "inferred",
        sourceLabel: `${basePricing.sourceLabel}（按 codex 别名推断）`,
      };
    }
  }

  return null;
}

function estimateCost(tokenUsage, modelName) {
  const pricing = getPricingForModel(modelName);
  if (!tokenUsage || !pricing) {
    return null;
  }

  const inputUsd = (Number(tokenUsage.inputTokens || 0) / 1_000_000) * pricing.inputPerMillion;
  const cachedInputUsd =
    pricing.cachedInputPerMillion === null
      ? null
      : (Number(tokenUsage.cachedInputTokens || 0) / 1_000_000) * pricing.cachedInputPerMillion;
  const outputUsd = (Number(tokenUsage.outputTokens || 0) / 1_000_000) * pricing.outputPerMillion;

  return {
    modelName: pricing.normalizedModelName,
    pricingModelName: pricing.pricingModelName,
    pricingSourceType: pricing.sourceType,
    pricingSourceLabel: pricing.sourceLabel,
    pricingSourceUrl: pricing.sourceUrl,
    inputPerMillion: pricing.inputPerMillion,
    cachedInputPerMillion: pricing.cachedInputPerMillion,
    outputPerMillion: pricing.outputPerMillion,
    inputUsd,
    cachedInputUsd,
    outputUsd,
    totalUsd: inputUsd + (cachedInputUsd || 0) + outputUsd,
  };
}

module.exports = {
  normalizeModelName,
  getPricingForModel,
  estimateCost,
};
