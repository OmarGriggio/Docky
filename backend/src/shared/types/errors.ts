export class AppError extends Error {
    constructor(message: string, public statusCode: number) {
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