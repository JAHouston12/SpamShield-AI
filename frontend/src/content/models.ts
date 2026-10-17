/**
 * Narrative content for each model, keyed by the backend registry key (backend/ml/registry.py).
 * Adding a model: register it in the backend, retrain, then add an entry here.
 */
export interface ModelContent {
  summary: string;
  howItWorks: string;
  advantages: string[];
  limitations: string[];
  security: string;
}

export const MODEL_CONTENT: Record<string, ModelContent> = {
  logistic_regression: {
    summary: "A linear classifier that models the log-odds of spam as a weighted sum of TF-IDF and engineered features.",
    howItWorks: "Learns one weight per feature by minimizing regularized log-loss; a sigmoid turns the score into a probability.",
    advantages: ["Fast to train and serve", "Coefficients are directly interpretable", "Well-calibrated probabilities", "Strong on sparse text"],
    limitations: ["Cannot model feature interactions", "Assumes a linear decision boundary", "Sensitive to correlated features"],
    security: "The baseline control: transparent weights let analysts audit exactly which words trigger a block, which matters for compliance and appeals.",
  },
  naive_bayes: {
    summary: "Multinomial Naive Bayes applies Bayes' theorem assuming words occur independently given the class.",
    howItWorks: "Estimates P(word | spam) and P(word | ham) from term frequencies and multiplies them with the class prior.",
    advantages: ["Extremely fast, even on huge corpora", "Works with little training data", "The classic spam-filter algorithm"],
    limitations: ["Independence assumption is unrealistic", "Probabilities are poorly calibrated", "Easily swayed by injected 'good words'"],
    security: "Historically the backbone of email filters (e.g. SpamAssassin's Bayes module). Its weakness to good-word poisoning attacks is a known evasion vector.",
  },
  decision_tree: {
    summary: "A single tree of if/then splits on feature thresholds that partitions messages into spam and ham leaves.",
    howItWorks: "Recursively chooses the split that most reduces Gini impurity until leaves are pure or too small.",
    advantages: ["Human-readable rules", "Captures non-linear interactions", "No scaling required"],
    limitations: ["High variance, overfits easily", "Unstable: small data changes alter the tree", "Weak on sparse high-dimensional text"],
    security: "Rules can be exported to firewall-style filters, but a single tree is brittle: attackers who learn one rule can route around it.",
  },
  random_forest: {
    summary: "An ensemble of hundreds of decorrelated decision trees trained on bootstrap samples and random feature subsets.",
    howItWorks: "Each tree votes; averaging many high-variance trees yields a stable, low-variance classifier.",
    advantages: ["Robust to noise and overfitting", "Models feature interactions", "Very high precision on this task", "Built-in feature importance"],
    limitations: ["Larger memory footprint", "Slower inference than linear models", "Less transparent than a single tree"],
    security: "The improved model: its conservative voting sharply reduces false positives, so legitimate messages are rarely quarantined. That property keeps users from disabling the filter.",
  },
  knn: {
    summary: "K-Nearest Neighbors labels a message by the majority class of its most similar training messages.",
    howItWorks: "Computes cosine distance in TF-IDF space and takes a distance-weighted vote of the 5 nearest neighbors.",
    advantages: ["No training phase", "Naturally catches near-duplicate campaigns", "Simple to reason about"],
    limitations: ["Slow inference: compares against every stored message", "Suffers in high dimensions", "Memory grows with data"],
    security: "Effective at spotting variants of known campaigns (template reuse), but weak against novel attacks with unseen wording.",
  },
  svm: {
    summary: "A linear Support Vector Machine finds the maximum-margin hyperplane separating spam from ham.",
    howItWorks: "Optimizes hinge loss so the boundary sits as far as possible from both classes; Platt scaling provides probabilities.",
    advantages: ["State-of-the-art on sparse text", "Robust margin generalizes well", "Handles many features"],
    limitations: ["Probability estimates require calibration", "Kernel versions scale poorly", "Less interpretable than LR"],
    security: "A long-standing industry choice for content filtering; the margin offers some resistance to small adversarial word edits.",
  },
  adaboost: {
    summary: "Adaptive Boosting combines many weak learners (decision stumps), re-weighting examples that earlier learners got wrong.",
    howItWorks: "Each round focuses on misclassified messages; the final model is a weighted vote of all stumps.",
    advantages: ["Focuses on hard examples", "Little tuning needed", "Resistant to overfitting with stumps"],
    limitations: ["Sensitive to label noise and outliers", "Sequential, so slower to train", "Can underperform on sparse text"],
    security: "Its focus on hard cases suits obfuscated spam, but mislabeled training data (data poisoning) can disproportionately skew it.",
  },
  gradient_boosting: {
    summary: "Gradient Boosting builds shallow trees sequentially, each correcting the residual errors of the ensemble so far.",
    howItWorks: "Fits each new tree to the gradient of the log-loss; learning rate and depth control complexity.",
    advantages: ["High accuracy on tabular signals", "Captures complex interactions", "Flexible loss functions"],
    limitations: ["Slow to train on wide sparse data", "Many hyperparameters", "Can overfit without regularization"],
    security: "Excels when combining text with metadata (sender reputation, send rate), a natural extension for production threat scoring.",
  },
  xgboost: {
    summary: "XGBoost is a regularized, highly optimized gradient boosting library with native sparse-matrix support.",
    howItWorks: "Histogram-based tree building with L1/L2 regularization, column subsampling, and scale_pos_weight for imbalance.",
    advantages: ["Top-tier accuracy", "Fast, parallel training", "Built-in imbalance handling", "Production proven"],
    limitations: ["Many hyperparameters to tune", "Less interpretable without SHAP", "Larger models than linear baselines"],
    security: "Widely deployed in fraud and abuse detection pipelines; pairs naturally with TreeSHAP for per-alert explanations.",
  },
  mlp: {
    summary: "A multi-layer perceptron neural network with one hidden layer of 128 ReLU units.",
    howItWorks: "Learns non-linear feature combinations via backpropagation, with early stopping on a validation split.",
    advantages: ["Learns non-linear interactions", "Stepping stone to deep NLP models", "Competitive accuracy"],
    limitations: ["Opaque decision process", "Needs more data and tuning", "Training is stochastic"],
    security: "A bridge to transformer-based detectors. Its opacity makes explainability tooling mandatory before use in security operations.",
  },
};
