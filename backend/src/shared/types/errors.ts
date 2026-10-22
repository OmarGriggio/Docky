// `code`, when set, is sent along with the message - a stable value the
// frontend can map to its own translated text (the message itself is
// English, for logs and API users).
export class AppError extends Error {
    constructor(message: string, public statusCode: number, public code?: string) {
        super(message);
    }
}

export class NotFoundError extends AppError {
    constructor(message = "Not found") {
        super(message, 404);
    }
}

export class ConflictError extends AppError {
    constructor(message = "Conflict") {
        super(message, 409);
    }
}

export class UnauthorizedError extends AppError {
    constructor(message = "Invalid credentials") {
        super(message, 401);
    }
}

export class ForbiddenError extends AppError {
    constructor(message = "Forbidden") {
        super(message, 403);
    }
}