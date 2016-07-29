import jwt from 'jsonwebtoken';
import assert from 'assert';

import expressjwt from '../lib';
import UnauthorizedError from '../lib/errors/UnauthorizedError';

describe('string tokens', function () {

	let req = {};
	let res = {};

	it('should work with a valid string token', function () {

		const secret = 'shhhhhh';
		const token = jwt.sign('foo', secret);

		req.headers = {};
		req.headers.authorization = 'Bearer ' + token;

		const middleware = expressjwt({
			decode: jwt.decode,
			verify: jwt.verify,
			secret: secret
		});

		middleware(req, res, function () {
			assert.equal('foo', req.user);
		});

	});

});
