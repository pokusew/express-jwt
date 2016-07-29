class UnauthorizedError extends Error {

	constructor(code, error) {
		super(error.message);

		Error.captureStackTrace(this, this.constructor);

		this.name = 'UnauthorizedError';
		this.message = error.message;
		this.code = code;
		this.status = 401;
		this.inner = error;
	}

}

export default UnauthorizedError;
