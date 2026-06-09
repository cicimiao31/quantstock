import numpy as np
import pandas as pd
from typing import Optional


def predict_with_linear_regression(df: pd.DataFrame, days: int = 5) -> dict:
    """Simple linear regression based prediction as baseline."""
    close = df['close'].values
    if len(close) < 30:
        return {"predictions": [], "confidence": 0}

    x = np.arange(len(close)).reshape(-1, 1)
    y = close

    # Linear regression
    x_mean = x.mean()
    y_mean = y.mean()
    ss_xy = np.sum((x.flatten() - x_mean) * (y - y_mean))
    ss_xx = np.sum((x.flatten() - x_mean) ** 2)
    slope = ss_xy / ss_xx
    intercept = y_mean - slope * x_mean

    # Predict next N days
    future_x = np.arange(len(close), len(close) + days)
    predictions = slope * future_x + intercept

    # Confidence based on R²
    y_pred = slope * x.flatten() + intercept
    ss_res = np.sum((y - y_pred) ** 2)
    ss_tot = np.sum((y - y_mean) ** 2)
    r_squared = 1 - (ss_res / ss_tot) if ss_tot > 0 else 0

    return {
        "predictions": predictions.tolist(),
        "confidence": round(max(r_squared, 0), 3),
        "trend": "up" if slope > 0 else "down",
        "slope": round(float(slope), 4),
    }


def predict_with_arima_like(df: pd.DataFrame, days: int = 5) -> dict:
    """AR(5) model for short-term prediction."""
    close = df['close'].values
    if len(close) < 30:
        return {"predictions": [], "confidence": 0}

    returns = np.diff(close) / close[:-1]

    # Simple AR(5) using last 5 returns
    order = 5
    if len(returns) < order + 10:
        return predict_with_linear_regression(df, days)

    # Fit AR coefficients using OLS
    X = np.array([returns[i:i+order] for i in range(len(returns) - order)])
    y = returns[order:]

    # OLS solution: beta = (X'X)^-1 X'y
    try:
        XtX_inv = np.linalg.inv(X.T @ X)
        beta = XtX_inv @ X.T @ y
    except np.linalg.LinAlgError:
        return predict_with_linear_regression(df, days)

    # Predict forward
    last_returns = list(returns[-order:])
    predicted_returns = []
    for _ in range(days):
        pred = np.dot(beta, last_returns[-order:])
        predicted_returns.append(pred)
        last_returns.append(pred)

    # Convert returns to prices
    last_price = close[-1]
    predicted_prices = []
    for r in predicted_returns:
        last_price = last_price * (1 + r)
        predicted_prices.append(round(last_price, 2))

    # Confidence based on in-sample accuracy
    y_pred = X @ beta
    residuals = y - y_pred
    std_residual = np.std(residuals)

    return {
        "predictions": predicted_prices,
        "confidence": round(max(1 - std_residual * 10, 0.1), 3),
        "predicted_returns": [round(r * 100, 2) for r in predicted_returns],
        "model": "AR(5)",
    }


def predict_trend_ensemble(df: pd.DataFrame, days: int = 5) -> dict:
    """Ensemble prediction combining multiple methods."""
    linear = predict_with_linear_regression(df, days)
    ar = predict_with_arima_like(df, days)

    close = df['close'].values
    last_price = close[-1]

    # MA-based projection
    if len(close) >= 20:
        ma5_slope = (np.mean(close[-5:]) - np.mean(close[-10:-5])) / np.mean(close[-10:-5])
        ma_predictions = [last_price * (1 + ma5_slope * i) for i in range(1, days + 1)]
    else:
        ma_predictions = [last_price] * days

    # Combine predictions
    all_preds = []
    weights = []

    if linear["predictions"]:
        all_preds.append(linear["predictions"])
        weights.append(linear["confidence"])
    if ar["predictions"]:
        all_preds.append(ar["predictions"])
        weights.append(ar["confidence"])
    all_preds.append(ma_predictions)
    weights.append(0.3)

    if not all_preds:
        return {"predictions": [], "confidence": 0, "trend": "neutral"}

    # Weighted average
    total_weight = sum(weights)
    ensemble_predictions = []
    for day_idx in range(days):
        weighted_sum = sum(
            preds[day_idx] * w
            for preds, w in zip(all_preds, weights)
            if day_idx < len(preds)
        )
        ensemble_predictions.append(round(weighted_sum / total_weight, 2))

    avg_confidence = sum(weights) / len(weights)
    trend_direction = "up" if ensemble_predictions[-1] > last_price else "down" if ensemble_predictions[-1] < last_price else "neutral"
    expected_change = (ensemble_predictions[-1] - last_price) / last_price * 100

    # Price range (confidence interval)
    if len(close) >= 20:
        daily_std = np.std(np.diff(close[-20:]) / close[-20:-1])
    else:
        daily_std = 0.02

    price_ranges = []
    for i, pred in enumerate(ensemble_predictions):
        margin = last_price * daily_std * np.sqrt(i + 1) * 1.96
        price_ranges.append({
            "predicted": pred,
            "upper": round(pred + margin, 2),
            "lower": round(pred - margin, 2),
        })

    return {
        "predictions": ensemble_predictions,
        "price_ranges": price_ranges,
        "confidence": round(avg_confidence, 3),
        "trend": trend_direction,
        "expected_change_pct": round(expected_change, 2),
        "models_used": ["LinearRegression", "AR(5)", "MA_Projection"],
        "disclaimer": "预测仅供参考，不构成投资建议。股市有风险，入市需谨慎。",
    }
