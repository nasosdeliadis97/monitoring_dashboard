import type { ErrorRequestHandler, RequestHandler } from "express";

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  console.error("Unhandled API error:", error);

  if (error instanceof SyntaxError && "body" in error) {
    res.status(400).json({
      message: "Invalid JSON body",
    });
    return;
  }

  res.status(500).json({
    message: "Internal server error",
  });
};
