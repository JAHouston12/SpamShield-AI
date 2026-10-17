export const REASONING = [
  {
    family: "Linear (Logistic Regression, SVM)",
    how: "Each feature pushes the score up or down by a fixed learned weight. The prediction is the sum of these pushes, so the explanation is exact.",
    audit: "Read the coefficient table; per-message SHAP values equal weight × (value − average).",
  },
  {
    family: "Probabilistic (Naive Bayes)",
    how: "Compares how likely each word is in spam versus ham and multiplies the evidence. Words with large likelihood ratios dominate.",
    audit: "Inspect log-probability ratios. Watch for rare words with extreme ratios.",
  },
  {
    family: "Tree ensembles (Random Forest, Boosting, XGBoost)",
    how: "Hundreds of if/then rules vote. Importance reflects how much each feature reduces impurity across all splits; interactions are implicit.",
    audit: "Use impurity importance for global views and TreeSHAP for per-message attributions.",
  },
  {
    family: "Instance & neural (KNN, MLP)",
    how: "KNN reasons by analogy to similar past messages; the MLP learns non-linear combinations in a hidden layer.",
    audit: "Show nearest neighbors for KNN; use model-agnostic KernelSHAP or LIME for the MLP.",
  },
];

export const SHAP_SCHEMA = `{
  "model": "random_forest",
  "explainer": "shap.TreeExplainer",
  "base_value": -1.94,
  "features": [
    { "feature": "<PHONE>", "mean_abs_shap": 0.82, "direction": "spam" },
    { "feature": "[digit count]", "mean_abs_shap": 0.61, "direction": "spam" }
  ]
}`;
