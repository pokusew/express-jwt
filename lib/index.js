import UnauthorizedError from './errors/UnauthorizedError';
import unless from 'express-unless';
import async from 'async';
import set from 'lodash.set';

export {
	UnauthorizedError
};

export default function (options) {

	if (!options) throw new Error('required options must be set');

	if (!options.secret) throw new Error('secret must be set');

	if (!options.decode || !options.verify) throw new Error('decode and verify functions must be set');

	const secretCallback = (typeof options.secret === 'function') ? options.secret : ((_, __, cb) => cb(null, options.secret));

	const isRevokedCallback = options.isRevoked || ((_, __, cb) => cb(null, false));

	const requestProperty = options.userProperty || options.requestProperty || 'user';

	const middleware = function (req, res, next) {

		let token;

		// TODO wtf
		if (req.method === 'OPTIONS' && req.headers.hasOwnProperty('access-control-request-headers')) {
			var hasAuthInAccessControl = !!~req.headers['access-control-request-headers']
				.split(',').map(function (header) {
					return header.trim();
				}).indexOf('authorization');

			if (hasAuthInAccessControl) {
				return next();
			}
		}


		if (options.getToken && typeof options.getToken === 'function') {

			try {
				token = options.getToken(req);
			} catch (e) {
				return next(e);
			}

		}
		else if (req.headers && req.headers.authorization) {

			const parts = req.headers.authorization.split(' ');

			if (parts.length == 2) {

				const scheme = parts[0];
				const credentials = parts[1];

				if (/^Bearer$/i.test(scheme)) {

					token = credentials;

				} else {

					return next(
						new UnauthorizedError('credentials_bad_scheme', {
							message: 'Format is Authorization: Bearer [token]'
						})
					);

				}

			}
			else {

				return next(
					new UnauthorizedError('credentials_bad_format', {
						message: 'Format is Authorization: Bearer [token]'
					})
				);

			}
		}

		if (!token) {

			return next(
				new UnauthorizedError('credentials_required', {
					message: 'No authorization token was found'
				})
			);

		}

		const decodedToken = options.decode(token, {complete: true}) || {};

		async.waterfall(
			[

				function getSecret(callback) {

					const arity = secretCallback.length;

					if (arity == 4) {
						secretCallback(req, decodedToken.header, decodedToken.payload, callback);
					} else { // arity == 3
						secretCallback(req, decodedToken.payload, callback);
					}

				},

				function verifyToken(secret, callback) {

					options.verify(token, secret, options, function (err, decoded) {
						if (err) {
							callback(new UnauthorizedError('invalid_token', err));
						} else {
							callback(null, decoded);
						}
					});
				},

				function checkRevoked(decoded, callback) {

					isRevokedCallback(req, decodedToken.payload, function (err, revoked) {
						if (err) {
							callback(err);
						}
						else if (revoked) {
							callback(new UnauthorizedError('revoked_token', {message: 'The token has been revoked.'}));
						} else {
							callback(null, decoded);
						}
					});

				}

			],
			function (err, result) {

				if (err) {
					return next(err);
				}

				set(req, requestProperty, result);

				next();

			});
	};

	middleware.unless = unless;

	return middleware;

};
