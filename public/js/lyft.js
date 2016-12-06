(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

},{}],2:[function(require,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function placeHoldersCount (b64) {
  var len = b64.length
  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // the number of equal signs (place holders)
  // if there are two placeholders, than the two characters before it
  // represent one byte
  // if there is only one, then the three characters before it represent 2 bytes
  // this is just a cheap hack to not do indexOf twice
  return b64[len - 2] === '=' ? 2 : b64[len - 1] === '=' ? 1 : 0
}

function byteLength (b64) {
  // base64 is 4/3 + up to two characters of the original data
  return b64.length * 3 / 4 - placeHoldersCount(b64)
}

function toByteArray (b64) {
  var i, j, l, tmp, placeHolders, arr
  var len = b64.length
  placeHolders = placeHoldersCount(b64)

  arr = new Arr(len * 3 / 4 - placeHolders)

  // if there are placeholders, only get up to the last complete 4 chars
  l = placeHolders > 0 ? len - 4 : len

  var L = 0

  for (i = 0, j = 0; i < l; i += 4, j += 3) {
    tmp = (revLookup[b64.charCodeAt(i)] << 18) | (revLookup[b64.charCodeAt(i + 1)] << 12) | (revLookup[b64.charCodeAt(i + 2)] << 6) | revLookup[b64.charCodeAt(i + 3)]
    arr[L++] = (tmp >> 16) & 0xFF
    arr[L++] = (tmp >> 8) & 0xFF
    arr[L++] = tmp & 0xFF
  }

  if (placeHolders === 2) {
    tmp = (revLookup[b64.charCodeAt(i)] << 2) | (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[L++] = tmp & 0xFF
  } else if (placeHolders === 1) {
    tmp = (revLookup[b64.charCodeAt(i)] << 10) | (revLookup[b64.charCodeAt(i + 1)] << 4) | (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[L++] = (tmp >> 8) & 0xFF
    arr[L++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] + lookup[num >> 12 & 0x3F] + lookup[num >> 6 & 0x3F] + lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var output = ''
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    output += lookup[tmp >> 2]
    output += lookup[(tmp << 4) & 0x3F]
    output += '=='
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + (uint8[len - 1])
    output += lookup[tmp >> 10]
    output += lookup[(tmp >> 4) & 0x3F]
    output += lookup[(tmp << 2) & 0x3F]
    output += '='
  }

  parts.push(output)

  return parts.join('')
}

},{}],3:[function(require,module,exports){
(function (global){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')
var isArray = require('isarray')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * Due to various browser bugs, sometimes the Object implementation will be used even
 * when the browser supports typed arrays.
 *
 * Note:
 *
 *   - Firefox 4-29 lacks support for adding new properties to `Uint8Array` instances,
 *     See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
 *
 *   - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
 *
 *   - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
 *     incorrect length in some situations.

 * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they
 * get the Object implementation, which is slower but behaves correctly.
 */
Buffer.TYPED_ARRAY_SUPPORT = global.TYPED_ARRAY_SUPPORT !== undefined
  ? global.TYPED_ARRAY_SUPPORT
  : typedArraySupport()

/*
 * Export kMaxLength after typed array support is determined.
 */
exports.kMaxLength = kMaxLength()

function typedArraySupport () {
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = {__proto__: Uint8Array.prototype, foo: function () { return 42 }}
    return arr.foo() === 42 && // typed array instances can be augmented
        typeof arr.subarray === 'function' && // chrome 9-10 lack `subarray`
        arr.subarray(1, 1).byteLength === 0 // ie10 has broken `subarray`
  } catch (e) {
    return false
  }
}

function kMaxLength () {
  return Buffer.TYPED_ARRAY_SUPPORT
    ? 0x7fffffff
    : 0x3fffffff
}

function createBuffer (that, length) {
  if (kMaxLength() < length) {
    throw new RangeError('Invalid typed array length')
  }
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    that = new Uint8Array(length)
    that.__proto__ = Buffer.prototype
  } else {
    // Fallback: Return an object instance of the Buffer class
    if (that === null) {
      that = new Buffer(length)
    }
    that.length = length
  }

  return that
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  if (!Buffer.TYPED_ARRAY_SUPPORT && !(this instanceof Buffer)) {
    return new Buffer(arg, encodingOrOffset, length)
  }

  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new Error(
        'If encoding is specified then the first argument must be a string'
      )
    }
    return allocUnsafe(this, arg)
  }
  return from(this, arg, encodingOrOffset, length)
}

Buffer.poolSize = 8192 // not used by this implementation

// TODO: Legacy, not needed anymore. Remove in next major version.
Buffer._augment = function (arr) {
  arr.__proto__ = Buffer.prototype
  return arr
}

function from (that, value, encodingOrOffset, length) {
  if (typeof value === 'number') {
    throw new TypeError('"value" argument must not be a number')
  }

  if (typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer) {
    return fromArrayBuffer(that, value, encodingOrOffset, length)
  }

  if (typeof value === 'string') {
    return fromString(that, value, encodingOrOffset)
  }

  return fromObject(that, value)
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(null, value, encodingOrOffset, length)
}

if (Buffer.TYPED_ARRAY_SUPPORT) {
  Buffer.prototype.__proto__ = Uint8Array.prototype
  Buffer.__proto__ = Uint8Array
  if (typeof Symbol !== 'undefined' && Symbol.species &&
      Buffer[Symbol.species] === Buffer) {
    // Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
    Object.defineProperty(Buffer, Symbol.species, {
      value: null,
      configurable: true
    })
  }
}

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be a number')
  } else if (size < 0) {
    throw new RangeError('"size" argument must not be negative')
  }
}

function alloc (that, size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(that, size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(that, size).fill(fill, encoding)
      : createBuffer(that, size).fill(fill)
  }
  return createBuffer(that, size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(null, size, fill, encoding)
}

function allocUnsafe (that, size) {
  assertSize(size)
  that = createBuffer(that, size < 0 ? 0 : checked(size) | 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) {
    for (var i = 0; i < size; ++i) {
      that[i] = 0
    }
  }
  return that
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(null, size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(null, size)
}

function fromString (that, string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('"encoding" must be a valid string encoding')
  }

  var length = byteLength(string, encoding) | 0
  that = createBuffer(that, length)

  var actual = that.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    that = that.slice(0, actual)
  }

  return that
}

function fromArrayLike (that, array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  that = createBuffer(that, length)
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

function fromArrayBuffer (that, array, byteOffset, length) {
  array.byteLength // this throws if `array` is not a valid ArrayBuffer

  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('\'offset\' is out of bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('\'length\' is out of bounds')
  }

  if (byteOffset === undefined && length === undefined) {
    array = new Uint8Array(array)
  } else if (length === undefined) {
    array = new Uint8Array(array, byteOffset)
  } else {
    array = new Uint8Array(array, byteOffset, length)
  }

  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    that = array
    that.__proto__ = Buffer.prototype
  } else {
    // Fallback: Return an object instance of the Buffer class
    that = fromArrayLike(that, array)
  }
  return that
}

function fromObject (that, obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    that = createBuffer(that, len)

    if (that.length === 0) {
      return that
    }

    obj.copy(that, 0, 0, len)
    return that
  }

  if (obj) {
    if ((typeof ArrayBuffer !== 'undefined' &&
        obj.buffer instanceof ArrayBuffer) || 'length' in obj) {
      if (typeof obj.length !== 'number' || isnan(obj.length)) {
        return createBuffer(that, 0)
      }
      return fromArrayLike(that, obj)
    }

    if (obj.type === 'Buffer' && isArray(obj.data)) {
      return fromArrayLike(that, obj.data)
    }
  }

  throw new TypeError('First argument must be a string, Buffer, ArrayBuffer, Array, or array-like object.')
}

function checked (length) {
  // Note: cannot use `length < kMaxLength()` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= kMaxLength()) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + kMaxLength().toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return !!(b != null && b._isBuffer)
}

Buffer.compare = function compare (a, b) {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError('Arguments must be Buffers')
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (typeof ArrayBuffer !== 'undefined' && typeof ArrayBuffer.isView === 'function' &&
      (ArrayBuffer.isView(string) || string instanceof ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    string = '' + string
  }

  var len = string.length
  if (len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
      case undefined:
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) return utf8ToBytes(string).length // assume utf8
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// The property is used by `Buffer.isBuffer` and `is-buffer` (in Safari 5-7) to detect
// Buffer instances.
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length | 0
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  if (this.length > 0) {
    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
    if (this.length > max) str += ' ... '
  }
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (!Buffer.isBuffer(target)) {
    throw new TypeError('Argument must be a Buffer')
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset  // Coerce to Number.
  if (isNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (Buffer.TYPED_ARRAY_SUPPORT &&
        typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  if (strLen % 2 !== 0) throw new TypeError('Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (isNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset | 0
    if (isFinite(length)) {
      length = length | 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  // legacy write(string, encoding, offset, length) - remove in v0.13
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
      : (firstByte > 0xBF) ? 2
      : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256)
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    newBuf = this.subarray(start, end)
    newBuf.__proto__ = Buffer.prototype
  } else {
    var sliceLen = end - start
    newBuf = new Buffer(sliceLen, undefined)
    for (var i = 0; i < sliceLen; ++i) {
      newBuf[i] = this[i + start]
    }
  }

  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  this[offset] = (value & 0xff)
  return offset + 1
}

function objectWriteUInt16 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; ++i) {
    buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
      (littleEndian ? i : 1 - i) * 8
  }
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = (value & 0xff)
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

function objectWriteUInt32 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffffffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; ++i) {
    buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
  }
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset + 3] = (value >>> 24)
    this[offset + 2] = (value >>> 16)
    this[offset + 1] = (value >>> 8)
    this[offset] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = (value & 0xff)
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
    this[offset + 2] = (value >>> 16)
    this[offset + 3] = (value >>> 24)
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('sourceStart out of bounds')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start
  var i

  if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
    // ascending copy from start
    for (i = 0; i < len; ++i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, start + len),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if (code < 256) {
        val = code
      }
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : utf8ToBytes(new Buffer(val, encoding).toString())
    var len = bytes.length
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+\/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = stringtrim(str).replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

function isnan (val) {
  return val !== val // eslint-disable-line no-self-compare
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"base64-js":2,"ieee754":4,"isarray":5}],4:[function(require,module,exports){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],5:[function(require,module,exports){
var toString = {}.toString;

module.exports = Array.isArray || function (arr) {
  return toString.call(arr) == '[object Array]';
};

},{}],6:[function(require,module,exports){

/**
 * Expose `Emitter`.
 */

if (typeof module !== 'undefined') {
  module.exports = Emitter;
}

/**
 * Initialize a new `Emitter`.
 *
 * @api public
 */

function Emitter(obj) {
  if (obj) return mixin(obj);
};

/**
 * Mixin the emitter properties.
 *
 * @param {Object} obj
 * @return {Object}
 * @api private
 */

function mixin(obj) {
  for (var key in Emitter.prototype) {
    obj[key] = Emitter.prototype[key];
  }
  return obj;
}

/**
 * Listen on the given `event` with `fn`.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.on =
Emitter.prototype.addEventListener = function(event, fn){
  this._callbacks = this._callbacks || {};
  (this._callbacks['$' + event] = this._callbacks['$' + event] || [])
    .push(fn);
  return this;
};

/**
 * Adds an `event` listener that will be invoked a single
 * time then automatically removed.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.once = function(event, fn){
  function on() {
    this.off(event, on);
    fn.apply(this, arguments);
  }

  on.fn = fn;
  this.on(event, on);
  return this;
};

/**
 * Remove the given callback for `event` or all
 * registered callbacks.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.off =
Emitter.prototype.removeListener =
Emitter.prototype.removeAllListeners =
Emitter.prototype.removeEventListener = function(event, fn){
  this._callbacks = this._callbacks || {};

  // all
  if (0 == arguments.length) {
    this._callbacks = {};
    return this;
  }

  // specific event
  var callbacks = this._callbacks['$' + event];
  if (!callbacks) return this;

  // remove all handlers
  if (1 == arguments.length) {
    delete this._callbacks['$' + event];
    return this;
  }

  // remove specific handler
  var cb;
  for (var i = 0; i < callbacks.length; i++) {
    cb = callbacks[i];
    if (cb === fn || cb.fn === fn) {
      callbacks.splice(i, 1);
      break;
    }
  }
  return this;
};

/**
 * Emit `event` with the given args.
 *
 * @param {String} event
 * @param {Mixed} ...
 * @return {Emitter}
 */

Emitter.prototype.emit = function(event){
  this._callbacks = this._callbacks || {};
  var args = [].slice.call(arguments, 1)
    , callbacks = this._callbacks['$' + event];

  if (callbacks) {
    callbacks = callbacks.slice(0);
    for (var i = 0, len = callbacks.length; i < len; ++i) {
      callbacks[i].apply(this, args);
    }
  }

  return this;
};

/**
 * Return array of callbacks for `event`.
 *
 * @param {String} event
 * @return {Array}
 * @api public
 */

Emitter.prototype.listeners = function(event){
  this._callbacks = this._callbacks || {};
  return this._callbacks['$' + event] || [];
};

/**
 * Check if this emitter has `event` handlers.
 *
 * @param {String} event
 * @return {Boolean}
 * @api public
 */

Emitter.prototype.hasListeners = function(event){
  return !! this.listeners(event).length;
};

},{}],7:[function(require,module,exports){
(function (Buffer){
(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['superagent'], factory);
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS-like environments that support module.exports, like Node.
    module.exports = factory(require('superagent'));
  } else {
    // Browser globals (root is window)
    if (!root.LyftApi) {
      root.LyftApi = {};
    }
    root.LyftApi.ApiClient = factory(root.superagent);
  }
}(this, function(superagent) {
  'use strict';

  /**
   * @module ApiClient
   * @version 1.0.0
   */

  /**
   * Manages low level client-server communications, parameter marshalling, etc. There should not be any need for an
   * application to use this class directly - the *Api and model classes provide the public API for the service. The
   * contents of this file should be regarded as internal but are documented for completeness.
   * @alias module:ApiClient
   * @class
   */
  var exports = function() {
    /**
     * The base URL against which to resolve every API call's (relative) path.
     * @type {String}
     * @default https://api.lyft.com/v1
     */
    this.basePath = 'https://api.lyft.com/v1'.replace(/\/+$/, '');

    /**
     * The authentication methods to be included for all API calls.
     * @type {Array.<String>}
     */
    this.authentications = {
      'Client Authentication': {type: 'oauth2'},
      'User Authentication': {type: 'oauth2'}
    };

    /**
     * The default HTTP headers to be included for all API calls.
     * @type {Array.<String>}
     * @default {}
     */
    this.defaultHeaders = {};

    /**
     * The default HTTP timeout for all API calls.
     * @type {Number}
     * @default 60000
     */
    this.timeout = 60000;
  };

  /**
   * Returns a string representation for an actual parameter.
   * @param param The actual parameter.
   * @returns {String} The string representation of <code>param</code>.
   */
  exports.prototype.paramToString = function(param) {
    if (param == undefined || param == null) {
      return '';
    }
    if (param instanceof Date) {
      return param.toJSON();
    }
    return param.toString();
  };

  /**
   * Builds full URL by appending the given path to the base URL and replacing path parameter place-holders with parameter values.
   * NOTE: query parameters are not handled here.
   * @param {String} path The path to append to the base URL.
   * @param {Object} pathParams The parameter values to append.
   * @returns {String} The encoded path with parameter values substituted.
   */
  exports.prototype.buildUrl = function(path, pathParams) {
    if (!path.match(/^\//)) {
      path = '/' + path;
    }
    var url = this.basePath + path;
    var _this = this;
    url = url.replace(/\{([\w-]+)\}/g, function(fullMatch, key) {
      var value;
      if (pathParams.hasOwnProperty(key)) {
        value = _this.paramToString(pathParams[key]);
      } else {
        value = fullMatch;
      }
      return encodeURIComponent(value);
    });
    return url;
  };

  /**
   * Checks whether the given content type represents JSON.<br>
   * JSON content type examples:<br>
   * <ul>
   * <li>application/json</li>
   * <li>application/json; charset=UTF8</li>
   * <li>APPLICATION/JSON</li>
   * </ul>
   * @param {String} contentType The MIME content type to check.
   * @returns {Boolean} <code>true</code> if <code>contentType</code> represents JSON, otherwise <code>false</code>.
   */
  exports.prototype.isJsonMime = function(contentType) {
    return Boolean(contentType != null && contentType.match(/^application\/json(;.*)?$/i));
  };

  /**
   * Chooses a content type from the given array, with JSON preferred; i.e. return JSON if included, otherwise return the first.
   * @param {Array.<String>} contentTypes
   * @returns {String} The chosen content type, preferring JSON.
   */
  exports.prototype.jsonPreferredMime = function(contentTypes) {
    for (var i = 0; i < contentTypes.length; i++) {
      if (this.isJsonMime(contentTypes[i])) {
        return contentTypes[i];
      }
    }
    return contentTypes[0];
  };

  /**
   * Checks whether the given parameter value represents file-like content.
   * @param param The parameter to check.
   * @returns {Boolean} <code>true</code> if <code>param</code> represents a file. 
   */
  exports.prototype.isFileParam = function(param) {
    // fs.ReadStream in Node.js (but not in runtime like browserify)
    if (typeof window === 'undefined' &&
        typeof require === 'function' &&
        require('fs') &&
        param instanceof require('fs').ReadStream) {
      return true;
    }
    // Buffer in Node.js
    if (typeof Buffer === 'function' && param instanceof Buffer) {
      return true;
    }
    // Blob in browser
    if (typeof Blob === 'function' && param instanceof Blob) {
      return true;
    }
    // File in browser (it seems File object is also instance of Blob, but keep this for safe)
    if (typeof File === 'function' && param instanceof File) {
      return true;
    }
    return false;
  };

  /**
   * Normalizes parameter values:
   * <ul>
   * <li>remove nils</li>
   * <li>keep files and arrays</li>
   * <li>format to string with `paramToString` for other cases</li>
   * </ul>
   * @param {Object.<String, Object>} params The parameters as object properties.
   * @returns {Object.<String, Object>} normalized parameters.
   */
  exports.prototype.normalizeParams = function(params) {
    var newParams = {};
    for (var key in params) {
      if (params.hasOwnProperty(key) && params[key] != undefined && params[key] != null) {
        var value = params[key];
        if (this.isFileParam(value) || Array.isArray(value)) {
          newParams[key] = value;
        } else {
          newParams[key] = this.paramToString(value);
        }
      }
    }
    return newParams;
  };

  /**
   * Enumeration of collection format separator strategies.
   * @enum {String} 
   * @readonly
   */
  exports.CollectionFormatEnum = {
    /**
     * Comma-separated values. Value: <code>csv</code>
     * @const
     */
    CSV: ',',
    /**
     * Space-separated values. Value: <code>ssv</code>
     * @const
     */
    SSV: ' ',
    /**
     * Tab-separated values. Value: <code>tsv</code>
     * @const
     */
    TSV: '\t',
    /**
     * Pipe(|)-separated values. Value: <code>pipes</code>
     * @const
     */
    PIPES: '|',
    /**
     * Native array. Value: <code>multi</code>
     * @const
     */
    MULTI: 'multi'
  };

  /**
   * Builds a string representation of an array-type actual parameter, according to the given collection format.
   * @param {Array} param An array parameter.
   * @param {module:ApiClient.CollectionFormatEnum} collectionFormat The array element separator strategy.
   * @returns {String|Array} A string representation of the supplied collection, using the specified delimiter. Returns
   * <code>param</code> as is if <code>collectionFormat</code> is <code>multi</code>.
   */
  exports.prototype.buildCollectionParam = function buildCollectionParam(param, collectionFormat) {
    if (param == null) {
      return null;
    }
    switch (collectionFormat) {
      case 'csv':
        return param.map(this.paramToString).join(',');
      case 'ssv':
        return param.map(this.paramToString).join(' ');
      case 'tsv':
        return param.map(this.paramToString).join('\t');
      case 'pipes':
        return param.map(this.paramToString).join('|');
      case 'multi':
        // return the array directly as SuperAgent will handle it as expected
        return param.map(this.paramToString);
      default:
        throw new Error('Unknown collection format: ' + collectionFormat);
    }
  };

  /**
   * Applies authentication headers to the request.
   * @param {Object} request The request object created by a <code>superagent()</code> call.
   * @param {Array.<String>} authNames An array of authentication method names.
   */
  exports.prototype.applyAuthToRequest = function(request, authNames) {
    var _this = this;
    authNames.forEach(function(authName) {
      var auth = _this.authentications[authName];
      switch (auth.type) {
        case 'basic':
          if (auth.username || auth.password) {
            request.auth(auth.username || '', auth.password || '');
          }
          break;
        case 'apiKey':
          if (auth.apiKey) {
            var data = {};
            if (auth.apiKeyPrefix) {
              data[auth.name] = auth.apiKeyPrefix + ' ' + auth.apiKey;
            } else {
              data[auth.name] = auth.apiKey;
            }
            if (auth['in'] === 'header') {
              request.set(data);
            } else {
              request.query(data);
            }
          }
          break;
        case 'oauth2':
          if (auth.accessToken) {
            request.set({'Authorization': 'Bearer ' + auth.accessToken});
          }
          break;
        default:
          throw new Error('Unknown authentication type: ' + auth.type);
      }
    });
  };

  /**
   * Deserializes an HTTP response body into a value of the specified type.
   * @param {Object} response A SuperAgent response object.
   * @param {(String|Array.<String>|Object.<String, Object>|Function)} returnType The type to return. Pass a string for simple types
   * or the constructor function for a complex type. Pass an array containing the type name to return an array of that type. To
   * return an object, pass an object with one property whose name is the key type and whose value is the corresponding value type:
   * all properties on <code>data<code> will be converted to this type.
   * @returns A value of the specified type.
   */
  exports.prototype.deserialize = function deserialize(response, returnType) {
    if (response == null || returnType == null) {
      return null;
    }
    // Rely on SuperAgent for parsing response body.
    // See http://visionmedia.github.io/superagent/#parsing-response-bodies
    var data = response.body;
    if (data == null) {
      // SuperAgent does not always produce a body; use the unparsed response as a fallback
      data = response.text;
    }
    return exports.convertToType(data, returnType);
  };

  /**
   * Callback function to receive the result of the operation.
   * @callback module:ApiClient~callApiCallback
   * @param {String} error Error message, if any.
   * @param data The data returned by the service call.
   * @param {String} response The complete HTTP response.
   */

  /**
   * Invokes the REST service using the supplied settings and parameters.
   * @param {String} path The base URL to invoke.
   * @param {String} httpMethod The HTTP method to use.
   * @param {Object.<String, String>} pathParams A map of path parameters and their values.
   * @param {Object.<String, Object>} queryParams A map of query parameters and their values.
   * @param {Object.<String, Object>} headerParams A map of header parameters and their values.
   * @param {Object.<String, Object>} formParams A map of form parameters and their values.
   * @param {Object} bodyParam The value to pass as the request body.
   * @param {Array.<String>} authNames An array of authentication type names.
   * @param {Array.<String>} contentTypes An array of request MIME types.
   * @param {Array.<String>} accepts An array of acceptable response MIME types.
   * @param {(String|Array|ObjectFunction)} returnType The required type to return; can be a string for simple types or the
   * constructor for a complex type.
   * @param {module:ApiClient~callApiCallback} callback The callback function.
   * @returns {Object} The SuperAgent request object.
   */
  exports.prototype.callApi = function callApi(path, httpMethod, pathParams,
      queryParams, headerParams, formParams, bodyParam, authNames, contentTypes, accepts,
      returnType, callback) {

    var _this = this;
    var url = this.buildUrl(path, pathParams);
    var request = superagent(httpMethod, url);

    // apply authentications
    this.applyAuthToRequest(request, authNames);

    // set query parameters
    request.query(this.normalizeParams(queryParams));

    // set header parameters
    request.set(this.defaultHeaders).set(this.normalizeParams(headerParams));

    // set request timeout
    request.timeout(this.timeout);

    var contentType = this.jsonPreferredMime(contentTypes);
    if (contentType) {
      request.type(contentType);
    } else if (!request.header['Content-Type']) {
      request.type('application/json');
    }

    if (contentType === 'application/x-www-form-urlencoded') {
      request.send(this.normalizeParams(formParams));
    } else if (contentType == 'multipart/form-data') {
      var _formParams = this.normalizeParams(formParams);
      for (var key in _formParams) {
        if (_formParams.hasOwnProperty(key)) {
          if (this.isFileParam(_formParams[key])) {
            // file field
            request.attach(key, _formParams[key]);
          } else {
            request.field(key, _formParams[key]);
          }
        }
      }
    } else if (bodyParam) {
      request.send(bodyParam);
    }

    var accept = this.jsonPreferredMime(accepts);
    if (accept) {
      request.accept(accept);
    }


    request.end(function(error, response) {
      if (callback) {
        var data = null;
        if (!error) {
          data = _this.deserialize(response, returnType);
        }
        callback(error, data, response);
      }
    });

    return request;
  };

  /**
   * Parses an ISO-8601 string representation of a date value.
   * @param {String} str The date value as a string.
   * @returns {Date} The parsed date object.
   */
  exports.parseDate = function(str) {
    return new Date(str.replace(/T/i, ' '));
  };

  /**
   * Converts a value to the specified type.
   * @param {(String|Object)} data The data to convert, as a string or object.
   * @param {(String|Array.<String>|Object.<String, Object>|Function)} type The type to return. Pass a string for simple types
   * or the constructor function for a complex type. Pass an array containing the type name to return an array of that type. To
   * return an object, pass an object with one property whose name is the key type and whose value is the corresponding value type:
   * all properties on <code>data<code> will be converted to this type.
   * @returns An instance of the specified type.
   */
  exports.convertToType = function(data, type) {
    switch (type) {
      case 'Boolean':
        return Boolean(data);
      case 'Integer':
        return parseInt(data, 10);
      case 'Number':
        return parseFloat(data);
      case 'String':
        return String(data);
      case 'Date':
        return this.parseDate(String(data));
      default:
        if (type === Object) {
          // generic object, return directly
          return data;
        } else if (typeof type === 'function') {
          // for model type like: User
          return type.constructFromObject(data);
        } else if (Array.isArray(type)) {
          // for array type like: ['String']
          var itemType = type[0];
          return data.map(function(item) {
            return exports.convertToType(item, itemType);
          });
        } else if (typeof type === 'object') {
          // for plain object type like: {'String': 'Integer'}
          var keyType, valueType;
          for (var k in type) {
            if (type.hasOwnProperty(k)) {
              keyType = k;
              valueType = type[k];
              break;
            }
          }
          var result = {};
          for (var k in data) {
            if (data.hasOwnProperty(k)) {
              var key = exports.convertToType(k, keyType);
              var value = exports.convertToType(data[k], valueType);
              result[key] = value;
            }
          }
          return result;
        } else {
          // for unknown type, return the data directly
          return data;
        }
    }
  };

  /**
   * The default API client implementation.
   * @type {module:ApiClient}
   */
  exports.instance = new exports();

  return exports;
}));

}).call(this,require("buffer").Buffer)
},{"buffer":3,"fs":1,"superagent":55}],8:[function(require,module,exports){
(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['../ApiClient', '../model/InlineResponse200', '../model/Error', '../model/InlineResponse2001', '../model/InlineResponse2002', '../model/InlineResponse2004'], factory);
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS-like environments that support module.exports, like Node.
    module.exports = factory(require('../ApiClient'), require('../model/InlineResponse200'), require('../model/Error'), require('../model/InlineResponse2001'), require('../model/InlineResponse2002'), require('../model/InlineResponse2004'));
  } else {
    // Browser globals (root is window)
    if (!root.LyftApi) {
      root.LyftApi = {};
    }
    root.LyftApi.PublicApi = factory(root.LyftApi.ApiClient, root.LyftApi.InlineResponse200, root.LyftApi.Error, root.LyftApi.InlineResponse2001, root.LyftApi.InlineResponse2002, root.LyftApi.InlineResponse2004);
  }
}(this, function(ApiClient, InlineResponse200, Error, InlineResponse2001, InlineResponse2002, InlineResponse2004) {
  'use strict';

  /**
   * Public service.
   * @module api/PublicApi
   * @version 1.0.0
   */

  /**
   * Constructs a new PublicApi. 
   * @alias module:api/PublicApi
   * @class
   * @param {module:ApiClient} apiClient Optional API client implementation to use, default to {@link module:ApiClient#instance}
   * if unspecified.
   */
  var exports = function(apiClient) {
    this.apiClient = apiClient || ApiClient.instance;


    /**
     * Callback function to receive the result of the costGet operation.
     * @callback module:api/PublicApi~costGetCallback
     * @param {String} error Error message, if any.
     * @param {module:model/InlineResponse200} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Cost estimates
     * Estimate the cost of taking a Lyft between two points.\n
     * @param {Number} startLat Latitude of the starting location
     * @param {Number} startLng Longitude of the starting location
     * @param {Object} opts Optional parameters
     * @param {module:model/String} opts.rideType ID of a ride type
     * @param {Number} opts.endLat Latitude of the ending location
     * @param {Number} opts.endLng Longitude of the ending location
     * @param {module:api/PublicApi~costGetCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {module:model/InlineResponse200}
     */
    this.costGet = function(startLat, startLng, opts, callback) {
      opts = opts || {};
      var postBody = null;

      // verify the required parameter 'startLat' is set
      if (startLat == undefined || startLat == null) {
        throw "Missing the required parameter 'startLat' when calling costGet";
      }

      // verify the required parameter 'startLng' is set
      if (startLng == undefined || startLng == null) {
        throw "Missing the required parameter 'startLng' when calling costGet";
      }


      var pathParams = {
      };
      var queryParams = {
        'ride_type': opts['rideType'],
        'start_lat': startLat,
        'start_lng': startLng,
        'end_lat': opts['endLat'],
        'end_lng': opts['endLng']
      };
      var headerParams = {
      };
      var formParams = {
      };

      var authNames = ['Client Authentication', 'User Authentication'];
      var contentTypes = ['application/json'];
      var accepts = ['application/json'];
      var returnType = InlineResponse200;

      return this.apiClient.callApi(
        '/cost', 'GET',
        pathParams, queryParams, headerParams, formParams, postBody,
        authNames, contentTypes, accepts, returnType, callback
      );
    }

    /**
     * Callback function to receive the result of the driversGet operation.
     * @callback module:api/PublicApi~driversGetCallback
     * @param {String} error Error message, if any.
     * @param {module:model/InlineResponse2001} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Available drivers nearby
     * The drivers endpoint returns a list of nearby drivers&#39; lat and lng at a given location.\n
     * @param {Number} lat Latitude of a location
     * @param {Number} lng Longitude of a location
     * @param {module:api/PublicApi~driversGetCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {module:model/InlineResponse2001}
     */
    this.driversGet = function(lat, lng, callback) {
      var postBody = null;

      // verify the required parameter 'lat' is set
      if (lat == undefined || lat == null) {
        throw "Missing the required parameter 'lat' when calling driversGet";
      }

      // verify the required parameter 'lng' is set
      if (lng == undefined || lng == null) {
        throw "Missing the required parameter 'lng' when calling driversGet";
      }


      var pathParams = {
      };
      var queryParams = {
        'lat': lat,
        'lng': lng
      };
      var headerParams = {
      };
      var formParams = {
      };

      var authNames = ['Client Authentication', 'User Authentication'];
      var contentTypes = ['application/json'];
      var accepts = ['application/json'];
      var returnType = InlineResponse2001;

      return this.apiClient.callApi(
        '/drivers', 'GET',
        pathParams, queryParams, headerParams, formParams, postBody,
        authNames, contentTypes, accepts, returnType, callback
      );
    }

    /**
     * Callback function to receive the result of the etaGet operation.
     * @callback module:api/PublicApi~etaGetCallback
     * @param {String} error Error message, if any.
     * @param {module:model/InlineResponse2002} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Pickup ETAs
     * The ETA endpoint lets you know how quickly a Lyft driver can come get you\n
     * @param {Number} lat Latitude of a location
     * @param {Number} lng Longitude of a location
     * @param {Object} opts Optional parameters
     * @param {module:model/String} opts.rideType ID of a ride type
     * @param {module:api/PublicApi~etaGetCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {module:model/InlineResponse2002}
     */
    this.etaGet = function(lat, lng, opts, callback) {
      opts = opts || {};
      var postBody = null;

      // verify the required parameter 'lat' is set
      if (lat == undefined || lat == null) {
        throw "Missing the required parameter 'lat' when calling etaGet";
      }

      // verify the required parameter 'lng' is set
      if (lng == undefined || lng == null) {
        throw "Missing the required parameter 'lng' when calling etaGet";
      }


      var pathParams = {
      };
      var queryParams = {
        'lat': lat,
        'lng': lng,
        'ride_type': opts['rideType']
      };
      var headerParams = {
      };
      var formParams = {
      };

      var authNames = ['Client Authentication', 'User Authentication'];
      var contentTypes = ['application/json'];
      var accepts = ['application/json'];
      var returnType = InlineResponse2002;

      return this.apiClient.callApi(
        '/eta', 'GET',
        pathParams, queryParams, headerParams, formParams, postBody,
        authNames, contentTypes, accepts, returnType, callback
      );
    }

    /**
     * Callback function to receive the result of the ridetypesGet operation.
     * @callback module:api/PublicApi~ridetypesGetCallback
     * @param {String} error Error message, if any.
     * @param {module:model/InlineResponse2004} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Types of rides
     * The ride types endpoint returns information about what kinds of Lyft rides you can request at a given location.\n
     * @param {Number} lat Latitude of a location
     * @param {Number} lng Longitude of a location
     * @param {Object} opts Optional parameters
     * @param {module:model/String} opts.rideType ID of a ride type
     * @param {module:api/PublicApi~ridetypesGetCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {module:model/InlineResponse2004}
     */
    this.ridetypesGet = function(lat, lng, opts, callback) {
      opts = opts || {};
      var postBody = null;

      // verify the required parameter 'lat' is set
      if (lat == undefined || lat == null) {
        throw "Missing the required parameter 'lat' when calling ridetypesGet";
      }

      // verify the required parameter 'lng' is set
      if (lng == undefined || lng == null) {
        throw "Missing the required parameter 'lng' when calling ridetypesGet";
      }


      var pathParams = {
      };
      var queryParams = {
        'lat': lat,
        'lng': lng,
        'ride_type': opts['rideType']
      };
      var headerParams = {
      };
      var formParams = {
      };

      var authNames = ['Client Authentication', 'User Authentication'];
      var contentTypes = ['application/json'];
      var accepts = ['application/json'];
      var returnType = InlineResponse2004;

      return this.apiClient.callApi(
        '/ridetypes', 'GET',
        pathParams, queryParams, headerParams, formParams, postBody,
        authNames, contentTypes, accepts, returnType, callback
      );
    }
  };

  return exports;
}));

},{"../ApiClient":7,"../model/Error":19,"../model/InlineResponse200":22,"../model/InlineResponse2001":23,"../model/InlineResponse2002":24,"../model/InlineResponse2004":26}],9:[function(require,module,exports){
(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['../ApiClient', '../model/Error', '../model/SandboxPrimetime', '../model/RideStatusEnum', '../model/SandboxRideUpdate', '../model/SandboxRideType', '../model/SandboxDriverAvailability'], factory);
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS-like environments that support module.exports, like Node.
    module.exports = factory(require('../ApiClient'), require('../model/Error'), require('../model/SandboxPrimetime'), require('../model/RideStatusEnum'), require('../model/SandboxRideUpdate'), require('../model/SandboxRideType'), require('../model/SandboxDriverAvailability'));
  } else {
    // Browser globals (root is window)
    if (!root.LyftApi) {
      root.LyftApi = {};
    }
    root.LyftApi.SandboxApi = factory(root.LyftApi.ApiClient, root.LyftApi.Error, root.LyftApi.SandboxPrimetime, root.LyftApi.RideStatusEnum, root.LyftApi.SandboxRideUpdate, root.LyftApi.SandboxRideType, root.LyftApi.SandboxDriverAvailability);
  }
}(this, function(ApiClient, Error, SandboxPrimetime, RideStatusEnum, SandboxRideUpdate, SandboxRideType, SandboxDriverAvailability) {
  'use strict';

  /**
   * Sandbox service.
   * @module api/SandboxApi
   * @version 1.0.0
   */

  /**
   * Constructs a new SandboxApi. 
   * @alias module:api/SandboxApi
   * @class
   * @param {module:ApiClient} apiClient Optional API client implementation to use, default to {@link module:ApiClient#instance}
   * if unspecified.
   */
  var exports = function(apiClient) {
    this.apiClient = apiClient || ApiClient.instance;


    /**
     * Callback function to receive the result of the sandboxPrimetimePut operation.
     * @callback module:api/SandboxApi~sandboxPrimetimePutCallback
     * @param {String} error Error message, if any.
     * @param data This operation does not return a value.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Preset Prime Time percentage
     * Preset a Prime Time percentage in the region surrounding the specified location. This Prime Time percentage will be applied when requesting cost, or when requesting a ride in sandbox mode.\n
     * @param {Object} opts Optional parameters
     * @param {module:model/SandboxPrimetime} opts.request Prime Time to be preset in the region surrounding the lat, lng
     * @param {module:api/SandboxApi~sandboxPrimetimePutCallback} callback The callback function, accepting three arguments: error, data, response
     */
    this.sandboxPrimetimePut = function(opts, callback) {
      opts = opts || {};
      var postBody = opts['request'];


      var pathParams = {
      };
      var queryParams = {
      };
      var headerParams = {
      };
      var formParams = {
      };

      var authNames = ['Client Authentication', 'User Authentication'];
      var contentTypes = ['application/json'];
      var accepts = ['application/json'];
      var returnType = null;

      return this.apiClient.callApi(
        '/sandbox/primetime', 'PUT',
        pathParams, queryParams, headerParams, formParams, postBody,
        authNames, contentTypes, accepts, returnType, callback
      );
    }

    /**
     * Callback function to receive the result of the sandboxRidesIdPut operation.
     * @callback module:api/SandboxApi~sandboxRidesIdPutCallback
     * @param {String} error Error message, if any.
     * @param {module:model/SandboxRideUpdate} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Propagate ride through states
     * Propagate a sandbox-ride through various states\n
     * @param {String} id The ID of the ride
     * @param {Object} opts Optional parameters
     * @param {module:model/RideStatusEnum} opts.status state to propagate the ride into
     * @param {module:api/SandboxApi~sandboxRidesIdPutCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {module:model/SandboxRideUpdate}
     */
    this.sandboxRidesIdPut = function(id, opts, callback) {
      opts = opts || {};
      var postBody = opts['status'];

      // verify the required parameter 'id' is set
      if (id == undefined || id == null) {
        throw "Missing the required parameter 'id' when calling sandboxRidesIdPut";
      }


      var pathParams = {
        'id': id
      };
      var queryParams = {
      };
      var headerParams = {
      };
      var formParams = {
      };

      var authNames = ['User Authentication'];
      var contentTypes = ['application/json'];
      var accepts = ['application/json'];
      var returnType = SandboxRideUpdate;

      return this.apiClient.callApi(
        '/sandbox/rides/{id}', 'PUT',
        pathParams, queryParams, headerParams, formParams, postBody,
        authNames, contentTypes, accepts, returnType, callback
      );
    }

    /**
     * Callback function to receive the result of the sandboxRidetypesPut operation.
     * @callback module:api/SandboxApi~sandboxRidetypesPutCallback
     * @param {String} error Error message, if any.
     * @param {module:model/SandboxRideType} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Preset types of rides for sandbox
     * The sandbox-ridetypes endpoint allows you to preset the ridetypes in the region surrounding the specified latitude and longitude to allow testing different scenarios\n
     * @param {Object} opts Optional parameters
     * @param {module:model/SandboxRideType} opts.request Ridetypes to be preset in the region surrounding the lat, lng
     * @param {module:api/SandboxApi~sandboxRidetypesPutCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {module:model/SandboxRideType}
     */
    this.sandboxRidetypesPut = function(opts, callback) {
      opts = opts || {};
      var postBody = opts['request'];


      var pathParams = {
      };
      var queryParams = {
      };
      var headerParams = {
      };
      var formParams = {
      };

      var authNames = ['Client Authentication', 'User Authentication'];
      var contentTypes = ['application/json'];
      var accepts = ['application/json'];
      var returnType = SandboxRideType;

      return this.apiClient.callApi(
        '/sandbox/ridetypes', 'PUT',
        pathParams, queryParams, headerParams, formParams, postBody,
        authNames, contentTypes, accepts, returnType, callback
      );
    }

    /**
     * Callback function to receive the result of the sandboxRidetypesRideTypePut operation.
     * @callback module:api/SandboxApi~sandboxRidetypesRideTypePutCallback
     * @param {String} error Error message, if any.
     * @param data This operation does not return a value.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Driver availability for processing ride request
     * Set driver availability for the provided ride_type in the city/region surrounding the specified location\n
     * @param {module:model/String} rideType 
     * @param {Object} opts Optional parameters
     * @param {module:model/SandboxDriverAvailability} opts.request Driver availability to be preset in the region surrounding the lat, lng
     * @param {module:api/SandboxApi~sandboxRidetypesRideTypePutCallback} callback The callback function, accepting three arguments: error, data, response
     */
    this.sandboxRidetypesRideTypePut = function(rideType, opts, callback) {
      opts = opts || {};
      var postBody = opts['request'];

      // verify the required parameter 'rideType' is set
      if (rideType == undefined || rideType == null) {
        throw "Missing the required parameter 'rideType' when calling sandboxRidetypesRideTypePut";
      }


      var pathParams = {
        'ride_type': rideType
      };
      var queryParams = {
      };
      var headerParams = {
      };
      var formParams = {
      };

      var authNames = ['Client Authentication', 'User Authentication'];
      var contentTypes = ['application/json'];
      var accepts = ['application/json'];
      var returnType = null;

      return this.apiClient.callApi(
        '/sandbox/ridetypes/{ride_type}', 'PUT',
        pathParams, queryParams, headerParams, formParams, postBody,
        authNames, contentTypes, accepts, returnType, callback
      );
    }
  };

  return exports;
}));

},{"../ApiClient":7,"../model/Error":19,"../model/RideStatusEnum":42,"../model/SandboxDriverAvailability":46,"../model/SandboxPrimetime":47,"../model/SandboxRideType":48,"../model/SandboxRideUpdate":49}],10:[function(require,module,exports){
(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['../ApiClient', '../model/Error', '../model/InlineResponse2003', '../model/CancellationCostError', '../model/CancellationRequest', '../model/Location', '../model/RideDetail', '../model/RatingRequest', '../model/RideReceipt', '../model/RideRequestError', '../model/RideRequest', '../model/Ride'], factory);
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS-like environments that support module.exports, like Node.
    module.exports = factory(require('../ApiClient'), require('../model/Error'), require('../model/InlineResponse2003'), require('../model/CancellationCostError'), require('../model/CancellationRequest'), require('../model/Location'), require('../model/RideDetail'), require('../model/RatingRequest'), require('../model/RideReceipt'), require('../model/RideRequestError'), require('../model/RideRequest'), require('../model/Ride'));
  } else {
    // Browser globals (root is window)
    if (!root.LyftApi) {
      root.LyftApi = {};
    }
    root.LyftApi.UserApi = factory(root.LyftApi.ApiClient, root.LyftApi.Error, root.LyftApi.InlineResponse2003, root.LyftApi.CancellationCostError, root.LyftApi.CancellationRequest, root.LyftApi.Location, root.LyftApi.RideDetail, root.LyftApi.RatingRequest, root.LyftApi.RideReceipt, root.LyftApi.RideRequestError, root.LyftApi.RideRequest, root.LyftApi.Ride);
  }
}(this, function(ApiClient, Error, InlineResponse2003, CancellationCostError, CancellationRequest, Location, RideDetail, RatingRequest, RideReceipt, RideRequestError, RideRequest, Ride) {
  'use strict';

  /**
   * User service.
   * @module api/UserApi
   * @version 1.0.0
   */

  /**
   * Constructs a new UserApi. 
   * @alias module:api/UserApi
   * @class
   * @param {module:ApiClient} apiClient Optional API client implementation to use, default to {@link module:ApiClient#instance}
   * if unspecified.
   */
  var exports = function(apiClient) {
    this.apiClient = apiClient || ApiClient.instance;


    /**
     * Callback function to receive the result of the ridesGet operation.
     * @callback module:api/UserApi~ridesGetCallback
     * @param {String} error Error message, if any.
     * @param {module:model/InlineResponse2003} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * List rides
     * Get a list of past &amp; current rides for this passenger.\n
     * @param {Date} startTime Restrict to rides starting after this point in time. The earliest supported date is 2015-01-01T00:00:00+00:00\n
     * @param {Object} opts Optional parameters
     * @param {Date} opts.endTime Restrict to rides starting before this point in time. The earliest supported date is 2015-01-01T00:00:00+00:00\n
     * @param {Integer} opts.limit  (default to 10)
     * @param {module:api/UserApi~ridesGetCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {module:model/InlineResponse2003}
     */
    this.ridesGet = function(startTime, opts, callback) {
      opts = opts || {};
      var postBody = null;

      // verify the required parameter 'startTime' is set
      if (startTime == undefined || startTime == null) {
        throw "Missing the required parameter 'startTime' when calling ridesGet";
      }


      var pathParams = {
      };
      var queryParams = {
        'start_time': startTime,
        'end_time': opts['endTime'],
        'limit': opts['limit']
      };
      var headerParams = {
      };
      var formParams = {
      };

      var authNames = ['User Authentication'];
      var contentTypes = ['application/json'];
      var accepts = ['application/json'];
      var returnType = InlineResponse2003;

      return this.apiClient.callApi(
        '/rides', 'GET',
        pathParams, queryParams, headerParams, formParams, postBody,
        authNames, contentTypes, accepts, returnType, callback
      );
    }

    /**
     * Callback function to receive the result of the ridesIdCancelPost operation.
     * @callback module:api/UserApi~ridesIdCancelPostCallback
     * @param {String} error Error message, if any.
     * @param data This operation does not return a value.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Cancel a ongoing requested ride
     * Cancel a ongoing ride which was requested earlier by providing the ride id.\n
     * @param {String} id The ID of the ride
     * @param {Object} opts Optional parameters
     * @param {module:model/CancellationRequest} opts.request 
     * @param {module:api/UserApi~ridesIdCancelPostCallback} callback The callback function, accepting three arguments: error, data, response
     */
    this.ridesIdCancelPost = function(id, opts, callback) {
      opts = opts || {};
      var postBody = opts['request'];

      // verify the required parameter 'id' is set
      if (id == undefined || id == null) {
        throw "Missing the required parameter 'id' when calling ridesIdCancelPost";
      }


      var pathParams = {
        'id': id
      };
      var queryParams = {
      };
      var headerParams = {
      };
      var formParams = {
      };

      var authNames = ['User Authentication'];
      var contentTypes = ['application/json'];
      var accepts = ['application/json'];
      var returnType = null;

      return this.apiClient.callApi(
        '/rides/{id}/cancel', 'POST',
        pathParams, queryParams, headerParams, formParams, postBody,
        authNames, contentTypes, accepts, returnType, callback
      );
    }

    /**
     * Callback function to receive the result of the ridesIdDestinationPut operation.
     * @callback module:api/UserApi~ridesIdDestinationPutCallback
     * @param {String} error Error message, if any.
     * @param {module:model/Location} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Update the destination of the ride
     * Add or update the ride&#39;s destination. Note that the ride must still be active (not droppedOff or canceled), and that destinations on Lyft Line rides can not be changed.\n
     * @param {String} id The ID of the ride
     * @param {module:model/Location} request The coordinates and optional address of the destination
     * @param {module:api/UserApi~ridesIdDestinationPutCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {module:model/Location}
     */
    this.ridesIdDestinationPut = function(id, request, callback) {
      var postBody = request;

      // verify the required parameter 'id' is set
      if (id == undefined || id == null) {
        throw "Missing the required parameter 'id' when calling ridesIdDestinationPut";
      }

      // verify the required parameter 'request' is set
      if (request == undefined || request == null) {
        throw "Missing the required parameter 'request' when calling ridesIdDestinationPut";
      }


      var pathParams = {
        'id': id
      };
      var queryParams = {
      };
      var headerParams = {
      };
      var formParams = {
      };

      var authNames = ['User Authentication'];
      var contentTypes = ['application/json'];
      var accepts = ['application/json'];
      var returnType = Location;

      return this.apiClient.callApi(
        '/rides/{id}/destination', 'PUT',
        pathParams, queryParams, headerParams, formParams, postBody,
        authNames, contentTypes, accepts, returnType, callback
      );
    }

    /**
     * Callback function to receive the result of the ridesIdGet operation.
     * @callback module:api/UserApi~ridesIdGetCallback
     * @param {String} error Error message, if any.
     * @param {module:model/RideDetail} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Get the ride detail of a given ride ID
     * Get the status of a ride along with information about the driver, vehicle and price of a given ride ID\n
     * @param {String} id The ID of the ride
     * @param {module:api/UserApi~ridesIdGetCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {module:model/RideDetail}
     */
    this.ridesIdGet = function(id, callback) {
      var postBody = null;

      // verify the required parameter 'id' is set
      if (id == undefined || id == null) {
        throw "Missing the required parameter 'id' when calling ridesIdGet";
      }


      var pathParams = {
        'id': id
      };
      var queryParams = {
      };
      var headerParams = {
      };
      var formParams = {
      };

      var authNames = ['User Authentication'];
      var contentTypes = ['application/json'];
      var accepts = ['application/json'];
      var returnType = RideDetail;

      return this.apiClient.callApi(
        '/rides/{id}', 'GET',
        pathParams, queryParams, headerParams, formParams, postBody,
        authNames, contentTypes, accepts, returnType, callback
      );
    }

    /**
     * Callback function to receive the result of the ridesIdRatingPut operation.
     * @callback module:api/UserApi~ridesIdRatingPutCallback
     * @param {String} error Error message, if any.
     * @param data This operation does not return a value.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Add the passenger&#39;s rating, feedback, and tip
     * Add the passenger&#39;s 1 to 5 star rating of the ride, optional written feedback, and optional tip amount in minor units and currency. The ride must already be dropped off, and ratings must be given within 24 hours of drop off. For purposes of display, 5 is considered the default rating. When this endpoint is successfully called, payment processing will begin.\n
     * @param {String} id The ID of the ride
     * @param {module:model/RatingRequest} request The rating and optional feedback
     * @param {module:api/UserApi~ridesIdRatingPutCallback} callback The callback function, accepting three arguments: error, data, response
     */
    this.ridesIdRatingPut = function(id, request, callback) {
      var postBody = request;

      // verify the required parameter 'id' is set
      if (id == undefined || id == null) {
        throw "Missing the required parameter 'id' when calling ridesIdRatingPut";
      }

      // verify the required parameter 'request' is set
      if (request == undefined || request == null) {
        throw "Missing the required parameter 'request' when calling ridesIdRatingPut";
      }


      var pathParams = {
        'id': id
      };
      var queryParams = {
      };
      var headerParams = {
      };
      var formParams = {
      };

      var authNames = ['User Authentication'];
      var contentTypes = ['application/json'];
      var accepts = ['application/json'];
      var returnType = null;

      return this.apiClient.callApi(
        '/rides/{id}/rating', 'PUT',
        pathParams, queryParams, headerParams, formParams, postBody,
        authNames, contentTypes, accepts, returnType, callback
      );
    }

    /**
     * Callback function to receive the result of the ridesIdReceiptGet operation.
     * @callback module:api/UserApi~ridesIdReceiptGetCallback
     * @param {String} error Error message, if any.
     * @param {module:model/RideReceipt} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Get the receipt of the rides.
     * Get the receipt information of a processed ride by providing the ride id. Receipts will only be available to view once the payment has been processed. In the case of canceled ride, cancellation penalty is included if applicable.\n
     * @param {String} id The ID of the ride
     * @param {module:api/UserApi~ridesIdReceiptGetCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {module:model/RideReceipt}
     */
    this.ridesIdReceiptGet = function(id, callback) {
      var postBody = null;

      // verify the required parameter 'id' is set
      if (id == undefined || id == null) {
        throw "Missing the required parameter 'id' when calling ridesIdReceiptGet";
      }


      var pathParams = {
        'id': id
      };
      var queryParams = {
      };
      var headerParams = {
      };
      var formParams = {
      };

      var authNames = ['User Authentication'];
      var contentTypes = ['application/json'];
      var accepts = ['application/json'];
      var returnType = RideReceipt;

      return this.apiClient.callApi(
        '/rides/{id}/receipt', 'GET',
        pathParams, queryParams, headerParams, formParams, postBody,
        authNames, contentTypes, accepts, returnType, callback
      );
    }

    /**
     * Callback function to receive the result of the ridesPost operation.
     * @callback module:api/UserApi~ridesPostCallback
     * @param {String} error Error message, if any.
     * @param {module:model/RideRequest} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Request a Lyft
     * Request a Lyft come pick you up at the given location.\n
     * @param {Object} opts Optional parameters
     * @param {module:model/Ride} opts.request Ride request information
     * @param {module:api/UserApi~ridesPostCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {module:model/RideRequest}
     */
    this.ridesPost = function(opts, callback) {
      opts = opts || {};
      var postBody = opts['request'];


      var pathParams = {
      };
      var queryParams = {
      };
      var headerParams = {
      };
      var formParams = {
      };

      var authNames = ['User Authentication'];
      var contentTypes = ['application/json'];
      var accepts = ['application/json'];
      var returnType = RideRequest;

      return this.apiClient.callApi(
        '/rides', 'POST',
        pathParams, queryParams, headerParams, formParams, postBody,
        authNames, contentTypes, accepts, returnType, callback
      );
    }
  };

  return exports;
}));

},{"../ApiClient":7,"../model/CancellationCostError":13,"../model/CancellationRequest":14,"../model/Error":19,"../model/InlineResponse2003":25,"../model/Location":29,"../model/RatingRequest":35,"../model/Ride":36,"../model/RideDetail":37,"../model/RideReceipt":39,"../model/RideRequest":40,"../model/RideRequestError":41}],11:[function(require,module,exports){
(function(factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['./ApiClient', './model/CancellationCost', './model/CancellationCostError', './model/CancellationRequest', './model/Charge', './model/Cost', './model/CostEstimate', './model/DriverDetail', './model/Error', './model/ErrorDetail', './model/Eta', './model/InlineResponse200', './model/InlineResponse2001', './model/InlineResponse2002', './model/InlineResponse2003', './model/InlineResponse2004', './model/LatLng', './model/LineItem', './model/Location', './model/NearbyDriver', './model/NearbyDriversByRideType', './model/PassengerDetail', './model/PickupDropoffLocation', './model/PricingDetails', './model/RatingRequest', './model/Ride', './model/RideDetail', './model/RideLocation', './model/RideReceipt', './model/RideRequest', './model/RideRequestError', './model/RideStatusEnum', './model/RideType', './model/RideTypeEnum', './model/RideTypeEnumWithOther', './model/SandboxDriverAvailability', './model/SandboxPrimetime', './model/SandboxRideType', './model/SandboxRideUpdate', './model/Tip', './model/TipParams', './model/UserDetail', './model/VehicleDetail', './api/PublicApi', './api/SandboxApi', './api/UserApi'], factory);
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS-like environments that support module.exports, like Node.
    module.exports = factory(require('./ApiClient'), require('./model/CancellationCost'), require('./model/CancellationCostError'), require('./model/CancellationRequest'), require('./model/Charge'), require('./model/Cost'), require('./model/CostEstimate'), require('./model/DriverDetail'), require('./model/Error'), require('./model/ErrorDetail'), require('./model/Eta'), require('./model/InlineResponse200'), require('./model/InlineResponse2001'), require('./model/InlineResponse2002'), require('./model/InlineResponse2003'), require('./model/InlineResponse2004'), require('./model/LatLng'), require('./model/LineItem'), require('./model/Location'), require('./model/NearbyDriver'), require('./model/NearbyDriversByRideType'), require('./model/PassengerDetail'), require('./model/PickupDropoffLocation'), require('./model/PricingDetails'), require('./model/RatingRequest'), require('./model/Ride'), require('./model/RideDetail'), require('./model/RideLocation'), require('./model/RideReceipt'), require('./model/RideRequest'), require('./model/RideRequestError'), require('./model/RideStatusEnum'), require('./model/RideType'), require('./model/RideTypeEnum'), require('./model/RideTypeEnumWithOther'), require('./model/SandboxDriverAvailability'), require('./model/SandboxPrimetime'), require('./model/SandboxRideType'), require('./model/SandboxRideUpdate'), require('./model/Tip'), require('./model/TipParams'), require('./model/UserDetail'), require('./model/VehicleDetail'), require('./api/PublicApi'), require('./api/SandboxApi'), require('./api/UserApi'));
  }
}(function(ApiClient, CancellationCost, CancellationCostError, CancellationRequest, Charge, Cost, CostEstimate, DriverDetail, Error, ErrorDetail, Eta, InlineResponse200, InlineResponse2001, InlineResponse2002, InlineResponse2003, InlineResponse2004, LatLng, LineItem, Location, NearbyDriver, NearbyDriversByRideType, PassengerDetail, PickupDropoffLocation, PricingDetails, RatingRequest, Ride, RideDetail, RideLocation, RideReceipt, RideRequest, RideRequestError, RideStatusEnum, RideType, RideTypeEnum, RideTypeEnumWithOther, SandboxDriverAvailability, SandboxPrimetime, SandboxRideType, SandboxRideUpdate, Tip, TipParams, UserDetail, VehicleDetail, PublicApi, SandboxApi, UserApi) {
  'use strict';

  /**
   * Drive your app to success with Lyft&#39;s API.<br>
   * The <code>index</code> module provides access to constructors for all the classes which comprise the public API.
   * <p>
   * An AMD (recommended!) or CommonJS application will generally do something equivalent to the following:
   * <pre>
   * var LyftApi = require('./index'); // See note below*.
   * var xxxSvc = new LyftApi.XxxApi(); // Allocate the API class we're going to use.
   * var yyyModel = new LyftApi.Yyy(); // Construct a model instance.
   * yyyModel.someProperty = 'someValue';
   * ...
   * var zzz = xxxSvc.doSomething(yyyModel); // Invoke the service.
   * ...
   * </pre>
   * <em>*NOTE: For a top-level AMD script, use require(['./index'], function(){...}) and put the application logic within the
   * callback function.</em>
   * </p>
   * <p>
   * A non-AMD browser application (discouraged) might do something like this:
   * <pre>
   * var xxxSvc = new LyftApi.XxxApi(); // Allocate the API class we're going to use.
   * var yyy = new LyftApi.Yyy(); // Construct a model instance.
   * yyyModel.someProperty = 'someValue';
   * ...
   * var zzz = xxxSvc.doSomething(yyyModel); // Invoke the service.
   * ...
   * </pre>
   * </p>
   * @module index
   * @version 1.0.0
   */
  var exports = {
    /**
     * The ApiClient constructor.
     * @property {module:ApiClient}
     */
    ApiClient: ApiClient,
    /**
     * The CancellationCost model constructor.
     * @property {module:model/CancellationCost}
     */
    CancellationCost: CancellationCost,
    /**
     * The CancellationCostError model constructor.
     * @property {module:model/CancellationCostError}
     */
    CancellationCostError: CancellationCostError,
    /**
     * The CancellationRequest model constructor.
     * @property {module:model/CancellationRequest}
     */
    CancellationRequest: CancellationRequest,
    /**
     * The Charge model constructor.
     * @property {module:model/Charge}
     */
    Charge: Charge,
    /**
     * The Cost model constructor.
     * @property {module:model/Cost}
     */
    Cost: Cost,
    /**
     * The CostEstimate model constructor.
     * @property {module:model/CostEstimate}
     */
    CostEstimate: CostEstimate,
    /**
     * The DriverDetail model constructor.
     * @property {module:model/DriverDetail}
     */
    DriverDetail: DriverDetail,
    /**
     * The Error model constructor.
     * @property {module:model/Error}
     */
    Error: Error,
    /**
     * The ErrorDetail model constructor.
     * @property {module:model/ErrorDetail}
     */
    ErrorDetail: ErrorDetail,
    /**
     * The Eta model constructor.
     * @property {module:model/Eta}
     */
    Eta: Eta,
    /**
     * The InlineResponse200 model constructor.
     * @property {module:model/InlineResponse200}
     */
    InlineResponse200: InlineResponse200,
    /**
     * The InlineResponse2001 model constructor.
     * @property {module:model/InlineResponse2001}
     */
    InlineResponse2001: InlineResponse2001,
    /**
     * The InlineResponse2002 model constructor.
     * @property {module:model/InlineResponse2002}
     */
    InlineResponse2002: InlineResponse2002,
    /**
     * The InlineResponse2003 model constructor.
     * @property {module:model/InlineResponse2003}
     */
    InlineResponse2003: InlineResponse2003,
    /**
     * The InlineResponse2004 model constructor.
     * @property {module:model/InlineResponse2004}
     */
    InlineResponse2004: InlineResponse2004,
    /**
     * The LatLng model constructor.
     * @property {module:model/LatLng}
     */
    LatLng: LatLng,
    /**
     * The LineItem model constructor.
     * @property {module:model/LineItem}
     */
    LineItem: LineItem,
    /**
     * The Location model constructor.
     * @property {module:model/Location}
     */
    Location: Location,
    /**
     * The NearbyDriver model constructor.
     * @property {module:model/NearbyDriver}
     */
    NearbyDriver: NearbyDriver,
    /**
     * The NearbyDriversByRideType model constructor.
     * @property {module:model/NearbyDriversByRideType}
     */
    NearbyDriversByRideType: NearbyDriversByRideType,
    /**
     * The PassengerDetail model constructor.
     * @property {module:model/PassengerDetail}
     */
    PassengerDetail: PassengerDetail,
    /**
     * The PickupDropoffLocation model constructor.
     * @property {module:model/PickupDropoffLocation}
     */
    PickupDropoffLocation: PickupDropoffLocation,
    /**
     * The PricingDetails model constructor.
     * @property {module:model/PricingDetails}
     */
    PricingDetails: PricingDetails,
    /**
     * The RatingRequest model constructor.
     * @property {module:model/RatingRequest}
     */
    RatingRequest: RatingRequest,
    /**
     * The Ride model constructor.
     * @property {module:model/Ride}
     */
    Ride: Ride,
    /**
     * The RideDetail model constructor.
     * @property {module:model/RideDetail}
     */
    RideDetail: RideDetail,
    /**
     * The RideLocation model constructor.
     * @property {module:model/RideLocation}
     */
    RideLocation: RideLocation,
    /**
     * The RideReceipt model constructor.
     * @property {module:model/RideReceipt}
     */
    RideReceipt: RideReceipt,
    /**
     * The RideRequest model constructor.
     * @property {module:model/RideRequest}
     */
    RideRequest: RideRequest,
    /**
     * The RideRequestError model constructor.
     * @property {module:model/RideRequestError}
     */
    RideRequestError: RideRequestError,
    /**
     * The RideStatusEnum model constructor.
     * @property {module:model/RideStatusEnum}
     */
    RideStatusEnum: RideStatusEnum,
    /**
     * The RideType model constructor.
     * @property {module:model/RideType}
     */
    RideType: RideType,
    /**
     * The RideTypeEnum model constructor.
     * @property {module:model/RideTypeEnum}
     */
    RideTypeEnum: RideTypeEnum,
    /**
     * The RideTypeEnumWithOther model constructor.
     * @property {module:model/RideTypeEnumWithOther}
     */
    RideTypeEnumWithOther: RideTypeEnumWithOther,
    /**
     * The SandboxDriverAvailability model constructor.
     * @property {module:model/SandboxDriverAvailability}
     */
    SandboxDriverAvailability: SandboxDriverAvailability,
    /**
     * The SandboxPrimetime model constructor.
     * @property {module:model/SandboxPrimetime}
     */
    SandboxPrimetime: SandboxPrimetime,
    /**
     * The SandboxRideType model constructor.
     * @property {module:model/SandboxRideType}
     */
    SandboxRideType: SandboxRideType,
    /**
     * The SandboxRideUpdate model constructor.
     * @property {module:model/SandboxRideUpdate}
     */
    SandboxRideUpdate: SandboxRideUpdate,
    /**
     * The Tip model constructor.
     * @property {module:model/Tip}
     */
    Tip: Tip,
    /**
     * The TipParams model constructor.
     * @property {module:model/TipParams}
     */
    TipParams: TipParams,
    /**
     * The UserDetail model constructor.
     * @property {module:model/UserDetail}
     */
    UserDetail: UserDetail,
    /**
     * The VehicleDetail model constructor.
     * @property {module:model/VehicleDetail}
     */
    VehicleDetail: VehicleDetail,
    /**
     * The PublicApi service constructor.
     * @property {module:api/PublicApi}
     */
    PublicApi: PublicApi,
    /**
     * The SandboxApi service constructor.
     * @property {module:api/SandboxApi}
     */
    SandboxApi: SandboxApi,
    /**
     * The UserApi service constructor.
     * @property {module:api/UserApi}
     */
    UserApi: UserApi
  };

  return exports;
}));

},{"./ApiClient":7,"./api/PublicApi":8,"./api/SandboxApi":9,"./api/UserApi":10,"./model/CancellationCost":12,"./model/CancellationCostError":13,"./model/CancellationRequest":14,"./model/Charge":15,"./model/Cost":16,"./model/CostEstimate":17,"./model/DriverDetail":18,"./model/Error":19,"./model/ErrorDetail":20,"./model/Eta":21,"./model/InlineResponse200":22,"./model/InlineResponse2001":23,"./model/InlineResponse2002":24,"./model/InlineResponse2003":25,"./model/InlineResponse2004":26,"./model/LatLng":27,"./model/LineItem":28,"./model/Location":29,"./model/NearbyDriver":30,"./model/NearbyDriversByRideType":31,"./model/PassengerDetail":32,"./model/PickupDropoffLocation":33,"./model/PricingDetails":34,"./model/RatingRequest":35,"./model/Ride":36,"./model/RideDetail":37,"./model/RideLocation":38,"./model/RideReceipt":39,"./model/RideRequest":40,"./model/RideRequestError":41,"./model/RideStatusEnum":42,"./model/RideType":43,"./model/RideTypeEnum":44,"./model/RideTypeEnumWithOther":45,"./model/SandboxDriverAvailability":46,"./model/SandboxPrimetime":47,"./model/SandboxRideType":48,"./model/SandboxRideUpdate":49,"./model/Tip":50,"./model/TipParams":51,"./model/UserDetail":52,"./model/VehicleDetail":53}],12:[function(require,module,exports){
(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['../ApiClient', './Cost'], factory);
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS-like environments that support module.exports, like Node.
    module.exports = factory(require('../ApiClient'), require('./Cost'));
  } else {
    // Browser globals (root is window)
    if (!root.LyftApi) {
      root.LyftApi = {};
    }
    root.LyftApi.CancellationCost = factory(root.LyftApi.ApiClient, root.LyftApi.Cost);
  }
}(this, function(ApiClient, Cost) {
  'use strict';

  /**
   * The CancellationCost model module.
   * @module model/CancellationCost
   * @version 1.0.0
   */

  /**
   * Constructs a new <code>CancellationCost</code>.
   * @alias module:model/CancellationCost
   * @class
   * @extends module:model/Cost
   * @param amount
   * @param currency
   * @param description
   */
  var exports = function(amount, currency, description) {
    Cost.call(this, amount, currency, description);


  };

  /**
   * Constructs a <code>CancellationCost</code> from a plain JavaScript object, optionally creating a new instance.
   * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
   * @param {Object} data The plain JavaScript object bearing properties of interest.
   * @param {module:model/CancellationCost} obj Optional instance to populate.
   * @return {module:model/CancellationCost} The populated <code>CancellationCost</code> instance.
   */
  exports.constructFromObject = function(data, obj) {
    if (data) { 
      obj = obj || new exports();
      Cost.constructFromObject(data, obj);
      if (data.hasOwnProperty('token')) {
        obj['token'] = ApiClient.convertToType(data['token'], 'String');
      }
      if (data.hasOwnProperty('token_duration')) {
        obj['token_duration'] = ApiClient.convertToType(data['token_duration'], 'Integer');
      }
    }
    return obj;
  }

  exports.prototype = Object.create(Cost.prototype);
  exports.prototype.constructor = exports;


  /**
   * Token used to confirm the fee when cancelling a request
   * @member {String} token
   */
  exports.prototype['token'] = undefined;

  /**
   * How long, in seconds, before the token expires
   * @member {Integer} token_duration
   */
  exports.prototype['token_duration'] = undefined;




  return exports;
}));

},{"../ApiClient":7,"./Cost":16}],13:[function(require,module,exports){
(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['../ApiClient', './CancellationCost', './Error', './ErrorDetail'], factory);
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS-like environments that support module.exports, like Node.
    module.exports = factory(require('../ApiClient'), require('./CancellationCost'), require('./Error'), require('./ErrorDetail'));
  } else {
    // Browser globals (root is window)
    if (!root.LyftApi) {
      root.LyftApi = {};
    }
    root.LyftApi.CancellationCostError = factory(root.LyftApi.ApiClient, root.LyftApi.CancellationCost, root.LyftApi.Error, root.LyftApi.ErrorDetail);
  }
}(this, function(ApiClient, CancellationCost, Error, ErrorDetail) {
  'use strict';

  /**
   * The CancellationCostError model module.
   * @module model/CancellationCostError
   * @version 1.0.0
   */

  /**
   * Constructs a new <code>CancellationCostError</code>.
   * @alias module:model/CancellationCostError
   * @class
   * @extends module:model/CancellationCost
   * @implements module:model/Error
   * @param amount
   * @param currency
   * @param description
   */
  var exports = function(amount, currency, description) {
    CancellationCost.call(this, amount, currency, description);
    Error.call(this);
  };

  /**
   * Constructs a <code>CancellationCostError</code> from a plain JavaScript object, optionally creating a new instance.
   * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
   * @param {Object} data The plain JavaScript object bearing properties of interest.
   * @param {module:model/CancellationCostError} obj Optional instance to populate.
   * @return {module:model/CancellationCostError} The populated <code>CancellationCostError</code> instance.
   */
  exports.constructFromObject = function(data, obj) {
    if (data) { 
      obj = obj || new exports();
      CancellationCost.constructFromObject(data, obj);
      Error.constructFromObject(data, obj);
    }
    return obj;
  }

  exports.prototype = Object.create(CancellationCost.prototype);
  exports.prototype.constructor = exports;


  // Implement Error interface:
  /**
   * A \"slug\" that serves as the error code (eg. \"bad_parameter\")
   * @member {String} error
   */
  exports.prototype['error'] = undefined;

  /**
   * @member {Array.<module:model/ErrorDetail>} error_detail
   */
  exports.prototype['error_detail'] = undefined;

  /**
   * A user-friendly description of the error (appropriate to show to an end-user)
   * @member {String} error_description
   */
  exports.prototype['error_description'] = undefined;




  return exports;
}));

},{"../ApiClient":7,"./CancellationCost":12,"./Error":19,"./ErrorDetail":20}],14:[function(require,module,exports){
(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['../ApiClient'], factory);
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS-like environments that support module.exports, like Node.
    module.exports = factory(require('../ApiClient'));
  } else {
    // Browser globals (root is window)
    if (!root.LyftApi) {
      root.LyftApi = {};
    }
    root.LyftApi.CancellationRequest = factory(root.LyftApi.ApiClient);
  }
}(this, function(ApiClient) {
  'use strict';

  /**
   * The CancellationRequest model module.
   * @module model/CancellationRequest
   * @version 1.0.0
   */

  /**
   * Constructs a new <code>CancellationRequest</code>.
   * @alias module:model/CancellationRequest
   * @class
   */
  var exports = function() {


  };

  /**
   * Constructs a <code>CancellationRequest</code> from a plain JavaScript object, optionally creating a new instance.
   * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
   * @param {Object} data The plain JavaScript object bearing properties of interest.
   * @param {module:model/CancellationRequest} obj Optional instance to populate.
   * @return {module:model/CancellationRequest} The populated <code>CancellationRequest</code> instance.
   */
  exports.constructFromObject = function(data, obj) {
    if (data) { 
      obj = obj || new exports();

      if (data.hasOwnProperty('cancel_confirmation_token')) {
        obj['cancel_confirmation_token'] = ApiClient.convertToType(data['cancel_confirmation_token'], 'String');
      }
    }
    return obj;
  }


  /**
   * Token affirming the user accepts the cancellation fee. Required if a cancellation fee is in effect.
   * @member {String} cancel_confirmation_token
   */
  exports.prototype['cancel_confirmation_token'] = undefined;




  return exports;
}));

},{"../ApiClient":7}],15:[function(require,module,exports){
(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['../ApiClient'], factory);
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS-like environments that support module.exports, like Node.
    module.exports = factory(require('../ApiClient'));
  } else {
    // Browser globals (root is window)
    if (!root.LyftApi) {
      root.LyftApi = {};
    }
    root.LyftApi.Charge = factory(root.LyftApi.ApiClient);
  }
}(this, function(ApiClient) {
  'use strict';

  /**
   * The Charge model module.
   * @module model/Charge
   * @version 1.0.0
   */

  /**
   * Constructs a new <code>Charge</code>.
   * @alias module:model/Charge
   * @class
   * @param amount
   * @param currency
   * @param paymentMethod
   */
  var exports = function(amount, currency, paymentMethod) {

    this['amount'] = amount;
    this['currency'] = currency;
    this['payment_method'] = paymentMethod;
  };

  /**
   * Constructs a <code>Charge</code> from a plain JavaScript object, optionally creating a new instance.
   * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
   * @param {Object} data The plain JavaScript object bearing properties of interest.
   * @param {module:model/Charge} obj Optional instance to populate.
   * @return {module:model/Charge} The populated <code>Charge</code> instance.
   */
  exports.constructFromObject = function(data, obj) {
    if (data) { 
      obj = obj || new exports();

      if (data.hasOwnProperty('amount')) {
        obj['amount'] = ApiClient.convertToType(data['amount'], 'Integer');
      }
      if (data.hasOwnProperty('currency')) {
        obj['currency'] = ApiClient.convertToType(data['currency'], 'String');
      }
      if (data.hasOwnProperty('payment_method')) {
        obj['payment_method'] = ApiClient.convertToType(data['payment_method'], 'String');
      }
    }
    return obj;
  }


  /**
   * The line item amount
   * @member {Integer} amount
   */
  exports.prototype['amount'] = undefined;

  /**
   * The currency for the amount
   * @member {String} currency
   */
  exports.prototype['currency'] = undefined;

  /**
   * The payment method display name.
   * @member {String} payment_method
   */
  exports.prototype['payment_method'] = undefined;




  return exports;
}));

},{"../ApiClient":7}],16:[function(require,module,exports){
(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['../ApiClient'], factory);
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS-like environments that support module.exports, like Node.
    module.exports = factory(require('../ApiClient'));
  } else {
    // Browser globals (root is window)
    if (!root.LyftApi) {
      root.LyftApi = {};
    }
    root.LyftApi.Cost = factory(root.LyftApi.ApiClient);
  }
}(this, function(ApiClient) {
  'use strict';

  /**
   * The Cost model module.
   * @module model/Cost
   * @version 1.0.0
   */

  /**
   * Constructs a new <code>Cost</code>.
   * @alias module:model/Cost
   * @class
   * @param amount
   * @param currency
   * @param description
   */
  var exports = function(amount, currency, description) {

    this['amount'] = amount;
    this['currency'] = currency;
    this['description'] = description;
  };

  /**
   * Constructs a <code>Cost</code> from a plain JavaScript object, optionally creating a new instance.
   * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
   * @param {Object} data The plain JavaScript object bearing properties of interest.
   * @param {module:model/Cost} obj Optional instance to populate.
   * @return {module:model/Cost} The populated <code>Cost</code> instance.
   */
  exports.constructFromObject = function(data, obj) {
    if (data) { 
      obj = obj || new exports();

      if (data.hasOwnProperty('amount')) {
        obj['amount'] = ApiClient.convertToType(data['amount'], 'Integer');
      }
      if (data.hasOwnProperty('currency')) {
        obj['currency'] = ApiClient.convertToType(data['currency'], 'String');
      }
      if (data.hasOwnProperty('description')) {
        obj['description'] = ApiClient.convertToType(data['description'], 'String');
      }
    }
    return obj;
  }


  /**
   * Total price of the ride
   * @member {Integer} amount
   */
  exports.prototype['amount'] = undefined;

  /**
   * The ISO 4217 currency code for the amount (e.g. USD)
   * @member {String} currency
   */
  exports.prototype['currency'] = undefined;

  /**
   * The description for the cost
   * @member {String} description
   */
  exports.prototype['description'] = undefined;




  return exports;
}));

},{"../ApiClient":7}],17:[function(require,module,exports){
(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['../ApiClient', './RideTypeEnum'], factory);
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS-like environments that support module.exports, like Node.
    module.exports = factory(require('../ApiClient'), require('./RideTypeEnum'));
  } else {
    // Browser globals (root is window)
    if (!root.LyftApi) {
      root.LyftApi = {};
    }
    root.LyftApi.CostEstimate = factory(root.LyftApi.ApiClient, root.LyftApi.RideTypeEnum);
  }
}(this, function(ApiClient, RideTypeEnum) {
  'use strict';

  /**
   * The CostEstimate model module.
   * @module model/CostEstimate
   * @version 1.0.0
   */

  /**
   * Constructs a new <code>CostEstimate</code>.
   * A non-guaranteed estimate of price
   * @alias module:model/CostEstimate
   * @class
   */
  var exports = function() {










  };

  /**
   * Constructs a <code>CostEstimate</code> from a plain JavaScript object, optionally creating a new instance.
   * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
   * @param {Object} data The plain JavaScript object bearing properties of interest.
   * @param {module:model/CostEstimate} obj Optional instance to populate.
   * @return {module:model/CostEstimate} The populated <code>CostEstimate</code> instance.
   */
  exports.constructFromObject = function(data, obj) {
    if (data) { 
      obj = obj || new exports();

      if (data.hasOwnProperty('ride_type')) {
        obj['ride_type'] = RideTypeEnum.constructFromObject(data['ride_type']);
      }
      if (data.hasOwnProperty('display_name')) {
        obj['display_name'] = ApiClient.convertToType(data['display_name'], 'String');
      }
      if (data.hasOwnProperty('currency')) {
        obj['currency'] = ApiClient.convertToType(data['currency'], 'String');
      }
      if (data.hasOwnProperty('estimated_cost_cents_min')) {
        obj['estimated_cost_cents_min'] = ApiClient.convertToType(data['estimated_cost_cents_min'], 'Integer');
      }
      if (data.hasOwnProperty('estimated_cost_cents_max')) {
        obj['estimated_cost_cents_max'] = ApiClient.convertToType(data['estimated_cost_cents_max'], 'Integer');
      }
      if (data.hasOwnProperty('estimated_distance_miles')) {
        obj['estimated_distance_miles'] = ApiClient.convertToType(data['estimated_distance_miles'], 'Number');
      }
      if (data.hasOwnProperty('estimated_duration_seconds')) {
        obj['estimated_duration_seconds'] = ApiClient.convertToType(data['estimated_duration_seconds'], 'Integer');
      }
      if (data.hasOwnProperty('primetime_percentage')) {
        obj['primetime_percentage'] = ApiClient.convertToType(data['primetime_percentage'], 'String');
      }
      if (data.hasOwnProperty('primetime_confirmation_token')) {
        obj['primetime_confirmation_token'] = ApiClient.convertToType(data['primetime_confirmation_token'], 'String');
      }
    }
    return obj;
  }


  /**
   * @member {module:model/RideTypeEnum} ride_type
   */
  exports.prototype['ride_type'] = undefined;

  /**
   * A human readable description of the ride type
   * @member {String} display_name
   */
  exports.prototype['display_name'] = undefined;

  /**
   * The ISO 4217 currency code for the amount (e.g. 'USD')
   * @member {String} currency
   */
  exports.prototype['currency'] = undefined;

  /**
   * Estimated lower bound for trip cost, in minor units (cents). Estimates are not guaranteed, and only provide a reasonable range based on current conditions.\n
   * @member {Integer} estimated_cost_cents_min
   */
  exports.prototype['estimated_cost_cents_min'] = undefined;

  /**
   * Estimated upper bound for trip cost, in minor units (cents). Estimates are not guaranteed, and only provide a reasonable range based on current conditions.\n
   * @member {Integer} estimated_cost_cents_max
   */
  exports.prototype['estimated_cost_cents_max'] = undefined;

  /**
   * Estimated distance for this trip\n
   * @member {Number} estimated_distance_miles
   */
  exports.prototype['estimated_distance_miles'] = undefined;

  /**
   * Estimated time to get from the start location to the end.\n
   * @member {Integer} estimated_duration_seconds
   */
  exports.prototype['estimated_duration_seconds'] = undefined;

  /**
   * Current Prime Time Percentage. Prime Time adds a percentage to ride costs, prior to other applicable fees. When ride requests greatly outnumber available drivers, our system will automatically turn on Prime Time.\nIf Prime Time is inactive, the value returned will be '0%'.\nNote: The returned estimate already has Prime Time factored in. The value is returned here for reference and to allow users to confirm/accept Prime Time prior to initiating a ride.\n
   * @member {String} primetime_percentage
   */
  exports.prototype['primetime_percentage'] = undefined;

  /**
   * This token is needed when requesting rides. See 'Request a Lyft' for more details
   * @member {String} primetime_confirmation_token
   */
  exports.prototype['primetime_confirmation_token'] = undefined;




  return exports;
}));

},{"../ApiClient":7,"./RideTypeEnum":44}],18:[function(require,module,exports){
(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['../ApiClient'], factory);
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS-like environments that support module.exports, like Node.
    module.exports = factory(require('../ApiClient'));
  } else {
    // Browser globals (root is window)
    if (!root.LyftApi) {
      root.LyftApi = {};
    }
    root.LyftApi.DriverDetail = factory(root.LyftApi.ApiClient);
  }
}(this, function(ApiClient) {
  'use strict';

  /**
   * The DriverDetail model module.
   * @module model/DriverDetail
   * @version 1.0.0
   */

  /**
   * Constructs a new <code>DriverDetail</code>.
   * @alias module:model/DriverDetail
   * @class
   * @param firstName
   * @param phoneNumber
   * @param rating
   * @param imageUrl
   */
  var exports = function(firstName, phoneNumber, rating, imageUrl) {

    this['first_name'] = firstName;
    this['phone_number'] = phoneNumber;
    this['rating'] = rating;
    this['image_url'] = imageUrl;
  };

  /**
   * Constructs a <code>DriverDetail</code> from a plain JavaScript object, optionally creating a new instance.
   * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
   * @param {Object} data The plain JavaScript object bearing properties of interest.
   * @param {module:model/DriverDetail} obj Optional instance to populate.
   * @return {module:model/DriverDetail} The populated <code>DriverDetail</code> instance.
   */
  exports.constructFromObject = function(data, obj) {
    if (data) { 
      obj = obj || new exports();

      if (data.hasOwnProperty('first_name')) {
        obj['first_name'] = ApiClient.convertToType(data['first_name'], 'String');
      }
      if (data.hasOwnProperty('phone_number')) {
        obj['phone_number'] = ApiClient.convertToType(data['phone_number'], 'String');
      }
      if (data.hasOwnProperty('rating')) {
        obj['rating'] = ApiClient.convertToType(data['rating'], 'String');
      }
      if (data.hasOwnProperty('image_url')) {
        obj['image_url'] = ApiClient.convertToType(data['image_url'], 'String');
      }
    }
    return obj;
  }


  /**
   * The driver's first name
   * @member {String} first_name
   */
  exports.prototype['first_name'] = undefined;

  /**
   * The driver's contact phone number. Must be E.164 formatted.\n
   * @member {String} phone_number
   */
  exports.prototype['phone_number'] = undefined;

  /**
   * The driver's rating based in 0-5 scale
   * @member {String} rating
   */
  exports.prototype['rating'] = undefined;

  /**
   * The driver's image url
   * @member {String} image_url
   */
  exports.prototype['image_url'] = undefined;




  return exports;
}));

},{"../ApiClient":7}],19:[function(require,module,exports){
(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['../ApiClient', './ErrorDetail'], factory);
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS-like environments that support module.exports, like Node.
    module.exports = factory(require('../ApiClient'), require('./ErrorDetail'));
  } else {
    // Browser globals (root is window)
    if (!root.LyftApi) {
      root.LyftApi = {};
    }
    root.LyftApi.Error = factory(root.LyftApi.ApiClient, root.LyftApi.ErrorDetail);
  }
}(this, function(ApiClient, ErrorDetail) {
  'use strict';

  /**
   * The Error model module.
   * @module model/Error
   * @version 1.0.0
   */

  /**
   * Constructs a new <code>Error</code>.
   * Details about why a request failed, such as missing or invalid parameters
   * @alias module:model/Error
   * @class
   */
  var exports = function() {




  };

  /**
   * Constructs a <code>Error</code> from a plain JavaScript object, optionally creating a new instance.
   * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
   * @param {Object} data The plain JavaScript object bearing properties of interest.
   * @param {module:model/Error} obj Optional instance to populate.
   * @return {module:model/Error} The populated <code>Error</code> instance.
   */
  exports.constructFromObject = function(data, obj) {
    if (data) { 
      obj = obj || new exports();

      if (data.hasOwnProperty('error')) {
        obj['error'] = ApiClient.convertToType(data['error'], 'String');
      }
      if (data.hasOwnProperty('error_detail')) {
        obj['error_detail'] = ApiClient.convertToType(data['error_detail'], [ErrorDetail]);
      }
      if (data.hasOwnProperty('error_description')) {
        obj['error_description'] = ApiClient.convertToType(data['error_description'], 'String');
      }
    }
    return obj;
  }


  /**
   * A \"slug\" that serves as the error code (eg. \"bad_parameter\")
   * @member {String} error
   */
  exports.prototype['error'] = undefined;

  /**
   * @member {Array.<module:model/ErrorDetail>} error_detail
   */
  exports.prototype['error_detail'] = undefined;

  /**
   * A user-friendly description of the error (appropriate to show to an end-user)
   * @member {String} error_description
   */
  exports.prototype['error_description'] = undefined;




  return exports;
}));

},{"../ApiClient":7,"./ErrorDetail":20}],20:[function(require,module,exports){
(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['../ApiClient'], factory);
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS-like environments that support module.exports, like Node.
    module.exports = factory(require('../ApiClient'));
  } else {
    // Browser globals (root is window)
    if (!root.LyftApi) {
      root.LyftApi = {};
    }
    root.LyftApi.ErrorDetail = factory(root.LyftApi.ApiClient);
  }
}(this, function(ApiClient) {
  'use strict';

  /**
   * The ErrorDetail model module.
   * @module model/ErrorDetail
   * @version 1.0.0
   */

  /**
   * Constructs a new <code>ErrorDetail</code>.
   * An object with a single key-value pair, where the key is the name of the invalid parameter, and the value is a description of the error.\n
   * @alias module:model/ErrorDetail
   * @class
   */
  var exports = function() {


  };

  /**
   * Constructs a <code>ErrorDetail</code> from a plain JavaScript object, optionally creating a new instance.
   * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
   * @param {Object} data The plain JavaScript object bearing properties of interest.
   * @param {module:model/ErrorDetail} obj Optional instance to populate.
   * @return {module:model/ErrorDetail} The populated <code>ErrorDetail</code> instance.
   */
  exports.constructFromObject = function(data, obj) {
    if (data) { 
      obj = obj || new exports();

      if (data.hasOwnProperty('field_name')) {
        obj['field_name'] = ApiClient.convertToType(data['field_name'], 'String');
      }
    }
    return obj;
  }


  /**
   * description of the error
   * @member {String} field_name
   */
  exports.prototype['field_name'] = undefined;




  return exports;
}));

},{"../ApiClient":7}],21:[function(require,module,exports){
(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['../ApiClient', './RideTypeEnum'], factory);
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS-like environments that support module.exports, like Node.
    module.exports = factory(require('../ApiClient'), require('./RideTypeEnum'));
  } else {
    // Browser globals (root is window)
    if (!root.LyftApi) {
      root.LyftApi = {};
    }
    root.LyftApi.Eta = factory(root.LyftApi.ApiClient, root.LyftApi.RideTypeEnum);
  }
}(this, function(ApiClient, RideTypeEnum) {
  'use strict';

  /**
   * The Eta model module.
   * @module model/Eta
   * @version 1.0.0
   */

  /**
   * Constructs a new <code>Eta</code>.
   * Estimated Time of Arrival
   * @alias module:model/Eta
   * @class
   */
  var exports = function() {




  };

  /**
   * Constructs a <code>Eta</code> from a plain JavaScript object, optionally creating a new instance.
   * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
   * @param {Object} data The plain JavaScript object bearing properties of interest.
   * @param {module:model/Eta} obj Optional instance to populate.
   * @return {module:model/Eta} The populated <code>Eta</code> instance.
   */
  exports.constructFromObject = function(data, obj) {
    if (data) { 
      obj = obj || new exports();

      if (data.hasOwnProperty('ride_type')) {
        obj['ride_type'] = RideTypeEnum.constructFromObject(data['ride_type']);
      }
      if (data.hasOwnProperty('display_name')) {
        obj['display_name'] = ApiClient.convertToType(data['display_name'], 'String');
      }
      if (data.hasOwnProperty('eta_seconds')) {
        obj['eta_seconds'] = ApiClient.convertToType(data['eta_seconds'], 'Integer');
      }
    }
    return obj;
  }


  /**
   * @member {module:model/RideTypeEnum} ride_type
   */
  exports.prototype['ride_type'] = undefined;

  /**
   * A human readable description of the ride type
   * @member {String} display_name
   */
  exports.prototype['display_name'] = undefined;

  /**
   * Estimated seconds for a driver to arrive
   * @member {Integer} eta_seconds
   */
  exports.prototype['eta_seconds'] = undefined;




  return exports;
}));

},{"../ApiClient":7,"./RideTypeEnum":44}],22:[function(require,module,exports){
(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['../ApiClient', './CostEstimate'], factory);
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS-like environments that support module.exports, like Node.
    module.exports = factory(require('../ApiClient'), require('./CostEstimate'));
  } else {
    // Browser globals (root is window)
    if (!root.LyftApi) {
      root.LyftApi = {};
    }
    root.LyftApi.InlineResponse200 = factory(root.LyftApi.ApiClient, root.LyftApi.CostEstimate);
  }
}(this, function(ApiClient, CostEstimate) {
  'use strict';

  /**
   * The InlineResponse200 model module.
   * @module model/InlineResponse200
   * @version 1.0.0
   */

  /**
   * Constructs a new <code>InlineResponse200</code>.
   * @alias module:model/InlineResponse200
   * @class
   */
  var exports = function() {


  };

  /**
   * Constructs a <code>InlineResponse200</code> from a plain JavaScript object, optionally creating a new instance.
   * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
   * @param {Object} data The plain JavaScript object bearing properties of interest.
   * @param {module:model/InlineResponse200} obj Optional instance to populate.
   * @return {module:model/InlineResponse200} The populated <code>InlineResponse200</code> instance.
   */
  exports.constructFromObject = function(data, obj) {
    if (data) { 
      obj = obj || new exports();

      if (data.hasOwnProperty('cost_estimates')) {
        obj['cost_estimates'] = ApiClient.convertToType(data['cost_estimates'], [CostEstimate]);
      }
    }
    return obj;
  }


  /**
   * @member {Array.<module:model/CostEstimate>} cost_estimates
   */
  exports.prototype['cost_estimates'] = undefined;




  return exports;
}));

},{"../ApiClient":7,"./CostEstimate":17}],23:[function(require,module,exports){
(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['../ApiClient', './NearbyDriversByRideType'], factory);
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS-like environments that support module.exports, like Node.
    module.exports = factory(require('../ApiClient'), require('./NearbyDriversByRideType'));
  } else {
    // Browser globals (root is window)
    if (!root.LyftApi) {
      root.LyftApi = {};
    }
    root.LyftApi.InlineResponse2001 = factory(root.LyftApi.ApiClient, root.LyftApi.NearbyDriversByRideType);
  }
}(this, function(ApiClient, NearbyDriversByRideType) {
  'use strict';

  /**
   * The InlineResponse2001 model module.
   * @module model/InlineResponse2001
   * @version 1.0.0
   */

  /**
   * Constructs a new <code>InlineResponse2001</code>.
   * @alias module:model/InlineResponse2001
   * @class
   */
  var exports = function() {


  };

  /**
   * Constructs a <code>InlineResponse2001</code> from a plain JavaScript object, optionally creating a new instance.
   * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
   * @param {Object} data The plain JavaScript object bearing properties of interest.
   * @param {module:model/InlineResponse2001} obj Optional instance to populate.
   * @return {module:model/InlineResponse2001} The populated <code>InlineResponse2001</code> instance.
   */
  exports.constructFromObject = function(data, obj) {
    if (data) { 
      obj = obj || new exports();

      if (data.hasOwnProperty('nearby_drivers')) {
        obj['nearby_drivers'] = ApiClient.convertToType(data['nearby_drivers'], [NearbyDriversByRideType]);
      }
    }
    return obj;
  }


  /**
   * @member {Array.<module:model/NearbyDriversByRideType>} nearby_drivers
   */
  exports.prototype['nearby_drivers'] = undefined;




  return exports;
}));

},{"../ApiClient":7,"./NearbyDriversByRideType":31}],24:[function(require,module,exports){
(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['../ApiClient', './Eta'], factory);
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS-like environments that support module.exports, like Node.
    module.exports = factory(require('../ApiClient'), require('./Eta'));
  } else {
    // Browser globals (root is window)
    if (!root.LyftApi) {
      root.LyftApi = {};
    }
    root.LyftApi.InlineResponse2002 = factory(root.LyftApi.ApiClient, root.LyftApi.Eta);
  }
}(this, function(ApiClient, Eta) {
  'use strict';

  /**
   * The InlineResponse2002 model module.
   * @module model/InlineResponse2002
   * @version 1.0.0
   */

  /**
   * Constructs a new <code>InlineResponse2002</code>.
   * @alias module:model/InlineResponse2002
   * @class
   */
  var exports = function() {


  };

  /**
   * Constructs a <code>InlineResponse2002</code> from a plain JavaScript object, optionally creating a new instance.
   * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
   * @param {Object} data The plain JavaScript object bearing properties of interest.
   * @param {module:model/InlineResponse2002} obj Optional instance to populate.
   * @return {module:model/InlineResponse2002} The populated <code>InlineResponse2002</code> instance.
   */
  exports.constructFromObject = function(data, obj) {
    if (data) { 
      obj = obj || new exports();

      if (data.hasOwnProperty('eta_estimates')) {
        obj['eta_estimates'] = ApiClient.convertToType(data['eta_estimates'], [Eta]);
      }
    }
    return obj;
  }


  /**
   * @member {Array.<module:model/Eta>} eta_estimates
   */
  exports.prototype['eta_estimates'] = undefined;




  return exports;
}));

},{"../ApiClient":7,"./Eta":21}],25:[function(require,module,exports){
(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['../ApiClient', './RideDetail'], factory);
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS-like environments that support module.exports, like Node.
    module.exports = factory(require('../ApiClient'), require('./RideDetail'));
  } else {
    // Browser globals (root is window)
    if (!root.LyftApi) {
      root.LyftApi = {};
    }
    root.LyftApi.InlineResponse2003 = factory(root.LyftApi.ApiClient, root.LyftApi.RideDetail);
  }
}(this, function(ApiClient, RideDetail) {
  'use strict';

  /**
   * The InlineResponse2003 model module.
   * @module model/InlineResponse2003
   * @version 1.0.0
   */

  /**
   * Constructs a new <code>InlineResponse2003</code>.
   * @alias module:model/InlineResponse2003
   * @class
   */
  var exports = function() {


  };

  /**
   * Constructs a <code>InlineResponse2003</code> from a plain JavaScript object, optionally creating a new instance.
   * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
   * @param {Object} data The plain JavaScript object bearing properties of interest.
   * @param {module:model/InlineResponse2003} obj Optional instance to populate.
   * @return {module:model/InlineResponse2003} The populated <code>InlineResponse2003</code> instance.
   */
  exports.constructFromObject = function(data, obj) {
    if (data) { 
      obj = obj || new exports();

      if (data.hasOwnProperty('ride_history')) {
        obj['ride_history'] = ApiClient.convertToType(data['ride_history'], [RideDetail]);
      }
    }
    return obj;
  }


  /**
   * @member {Array.<module:model/RideDetail>} ride_history
   */
  exports.prototype['ride_history'] = undefined;




  return exports;
}));

},{"../ApiClient":7,"./RideDetail":37}],26:[function(require,module,exports){
(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['../ApiClient', './RideType'], factory);
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS-like environments that support module.exports, like Node.
    module.exports = factory(require('../ApiClient'), require('./RideType'));
  } else {
    // Browser globals (root is window)
    if (!root.LyftApi) {
      root.LyftApi = {};
    }
    root.LyftApi.InlineResponse2004 = factory(root.LyftApi.ApiClient, root.LyftApi.RideType);
  }
}(this, function(ApiClient, RideType) {
  'use strict';

  /**
   * The InlineResponse2004 model module.
   * @module model/InlineResponse2004
   * @version 1.0.0
   */

  /**
   * Constructs a new <code>InlineResponse2004</code>.
   * @alias module:model/InlineResponse2004
   * @class
   */
  var exports = function() {


  };

  /**
   * Constructs a <code>InlineResponse2004</code> from a plain JavaScript object, optionally creating a new instance.
   * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
   * @param {Object} data The plain JavaScript object bearing properties of interest.
   * @param {module:model/InlineResponse2004} obj Optional instance to populate.
   * @return {module:model/InlineResponse2004} The populated <code>InlineResponse2004</code> instance.
   */
  exports.constructFromObject = function(data, obj) {
    if (data) { 
      obj = obj || new exports();

      if (data.hasOwnProperty('ride_types')) {
        obj['ride_types'] = ApiClient.convertToType(data['ride_types'], [RideType]);
      }
    }
    return obj;
  }


  /**
   * @member {Array.<module:model/RideType>} ride_types
   */
  exports.prototype['ride_types'] = undefined;




  return exports;
}));

},{"../ApiClient":7,"./RideType":43}],27:[function(require,module,exports){
(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['../ApiClient'], factory);
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS-like environments that support module.exports, like Node.
    module.exports = factory(require('../ApiClient'));
  } else {
    // Browser globals (root is window)
    if (!root.LyftApi) {
      root.LyftApi = {};
    }
    root.LyftApi.LatLng = factory(root.LyftApi.ApiClient);
  }
}(this, function(ApiClient) {
  'use strict';

  /**
   * The LatLng model module.
   * @module model/LatLng
   * @version 1.0.0
   */

  /**
   * Constructs a new <code>LatLng</code>.
   * @alias module:model/LatLng
   * @class
   * @param lat
   * @param lng
   */
  var exports = function(lat, lng) {

    this['lat'] = lat;
    this['lng'] = lng;
  };

  /**
   * Constructs a <code>LatLng</code> from a plain JavaScript object, optionally creating a new instance.
   * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
   * @param {Object} data The plain JavaScript object bearing properties of interest.
   * @param {module:model/LatLng} obj Optional instance to populate.
   * @return {module:model/LatLng} The populated <code>LatLng</code> instance.
   */
  exports.constructFromObject = function(data, obj) {
    if (data) { 
      obj = obj || new exports();

      if (data.hasOwnProperty('lat')) {
        obj['lat'] = ApiClient.convertToType(data['lat'], 'Number');
      }
      if (data.hasOwnProperty('lng')) {
        obj['lng'] = ApiClient.convertToType(data['lng'], 'Number');
      }
    }
    return obj;
  }


  /**
   * The latitude component of a location
   * @member {Number} lat
   */
  exports.prototype['lat'] = undefined;

  /**
   * The longitude component of a location
   * @member {Number} lng
   */
  exports.prototype['lng'] = undefined;




  return exports;
}));

},{"../ApiClient":7}],28:[function(require,module,exports){
(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['../ApiClient'], factory);
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS-like environments that support module.exports, like Node.
    module.exports = factory(require('../ApiClient'));
  } else {
    // Browser globals (root is window)
    if (!root.LyftApi) {
      root.LyftApi = {};
    }
    root.LyftApi.LineItem = factory(root.LyftApi.ApiClient);
  }
}(this, function(ApiClient) {
  'use strict';

  /**
   * The LineItem model module.
   * @module model/LineItem
   * @version 1.0.0
   */

  /**
   * Constructs a new <code>LineItem</code>.
   * @alias module:model/LineItem
   * @class
   * @param type
   * @param amount
   * @param currency
   */
  var exports = function(type, amount, currency) {

    this['type'] = type;
    this['amount'] = amount;
    this['currency'] = currency;
  };

  /**
   * Constructs a <code>LineItem</code> from a plain JavaScript object, optionally creating a new instance.
   * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
   * @param {Object} data The plain JavaScript object bearing properties of interest.
   * @param {module:model/LineItem} obj Optional instance to populate.
   * @return {module:model/LineItem} The populated <code>LineItem</code> instance.
   */
  exports.constructFromObject = function(data, obj) {
    if (data) { 
      obj = obj || new exports();

      if (data.hasOwnProperty('type')) {
        obj['type'] = ApiClient.convertToType(data['type'], 'String');
      }
      if (data.hasOwnProperty('amount')) {
        obj['amount'] = ApiClient.convertToType(data['amount'], 'Integer');
      }
      if (data.hasOwnProperty('currency')) {
        obj['currency'] = ApiClient.convertToType(data['currency'], 'String');
      }
    }
    return obj;
  }


  /**
   * The line item display name for a charge item
   * @member {String} type
   */
  exports.prototype['type'] = undefined;

  /**
   * The line item amount
   * @member {Integer} amount
   */
  exports.prototype['amount'] = undefined;

  /**
   * The currency for the amount
   * @member {String} currency
   */
  exports.prototype['currency'] = undefined;




  return exports;
}));

},{"../ApiClient":7}],29:[function(require,module,exports){
(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['../ApiClient', './LatLng'], factory);
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS-like environments that support module.exports, like Node.
    module.exports = factory(require('../ApiClient'), require('./LatLng'));
  } else {
    // Browser globals (root is window)
    if (!root.LyftApi) {
      root.LyftApi = {};
    }
    root.LyftApi.Location = factory(root.LyftApi.ApiClient, root.LyftApi.LatLng);
  }
}(this, function(ApiClient, LatLng) {
  'use strict';

  /**
   * The Location model module.
   * @module model/Location
   * @version 1.0.0
   */

  /**
   * Constructs a new <code>Location</code>.
   * @alias module:model/Location
   * @class
   * @extends module:model/LatLng
   * @param lat
   * @param lng
   */
  var exports = function(lat, lng) {
    LatLng.call(this, lat, lng);

  };

  /**
   * Constructs a <code>Location</code> from a plain JavaScript object, optionally creating a new instance.
   * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
   * @param {Object} data The plain JavaScript object bearing properties of interest.
   * @param {module:model/Location} obj Optional instance to populate.
   * @return {module:model/Location} The populated <code>Location</code> instance.
   */
  exports.constructFromObject = function(data, obj) {
    if (data) { 
      obj = obj || new exports();
      LatLng.constructFromObject(data, obj);
      if (data.hasOwnProperty('address')) {
        obj['address'] = ApiClient.convertToType(data['address'], 'String');
      }
    }
    return obj;
  }

  exports.prototype = Object.create(LatLng.prototype);
  exports.prototype.constructor = exports;


  /**
   * A human readable address at/near the given location
   * @member {String} address
   */
  exports.prototype['address'] = undefined;




  return exports;
}));

},{"../ApiClient":7,"./LatLng":27}],30:[function(require,module,exports){
(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['../ApiClient', './LatLng'], factory);
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS-like environments that support module.exports, like Node.
    module.exports = factory(require('../ApiClient'), require('./LatLng'));
  } else {
    // Browser globals (root is window)
    if (!root.LyftApi) {
      root.LyftApi = {};
    }
    root.LyftApi.NearbyDriver = factory(root.LyftApi.ApiClient, root.LyftApi.LatLng);
  }
}(this, function(ApiClient, LatLng) {
  'use strict';

  /**
   * The NearbyDriver model module.
   * @module model/NearbyDriver
   * @version 1.0.0
   */

  /**
   * Constructs a new <code>NearbyDriver</code>.
   * @alias module:model/NearbyDriver
   * @class
   */
  var exports = function() {


  };

  /**
   * Constructs a <code>NearbyDriver</code> from a plain JavaScript object, optionally creating a new instance.
   * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
   * @param {Object} data The plain JavaScript object bearing properties of interest.
   * @param {module:model/NearbyDriver} obj Optional instance to populate.
   * @return {module:model/NearbyDriver} The populated <code>NearbyDriver</code> instance.
   */
  exports.constructFromObject = function(data, obj) {
    if (data) { 
      obj = obj || new exports();

      if (data.hasOwnProperty('locations')) {
        obj['locations'] = ApiClient.convertToType(data['locations'], [LatLng]);
      }
    }
    return obj;
  }


  /**
   * the lastest recorded driver locations up to 5 sorted in chronological order.
   * @member {Array.<module:model/LatLng>} locations
   */
  exports.prototype['locations'] = undefined;




  return exports;
}));

},{"../ApiClient":7,"./LatLng":27}],31:[function(require,module,exports){
(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['../ApiClient', './NearbyDriver'], factory);
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS-like environments that support module.exports, like Node.
    module.exports = factory(require('../ApiClient'), require('./NearbyDriver'));
  } else {
    // Browser globals (root is window)
    if (!root.LyftApi) {
      root.LyftApi = {};
    }
    root.LyftApi.NearbyDriversByRideType = factory(root.LyftApi.ApiClient, root.LyftApi.NearbyDriver);
  }
}(this, function(ApiClient, NearbyDriver) {
  'use strict';

  /**
   * The NearbyDriversByRideType model module.
   * @module model/NearbyDriversByRideType
   * @version 1.0.0
   */

  /**
   * Constructs a new <code>NearbyDriversByRideType</code>.
   * @alias module:model/NearbyDriversByRideType
   * @class
   */
  var exports = function() {



  };

  /**
   * Constructs a <code>NearbyDriversByRideType</code> from a plain JavaScript object, optionally creating a new instance.
   * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
   * @param {Object} data The plain JavaScript object bearing properties of interest.
   * @param {module:model/NearbyDriversByRideType} obj Optional instance to populate.
   * @return {module:model/NearbyDriversByRideType} The populated <code>NearbyDriversByRideType</code> instance.
   */
  exports.constructFromObject = function(data, obj) {
    if (data) { 
      obj = obj || new exports();

      if (data.hasOwnProperty('ride_type')) {
        obj['ride_type'] = ApiClient.convertToType(data['ride_type'], 'String');
      }
      if (data.hasOwnProperty('drivers')) {
        obj['drivers'] = ApiClient.convertToType(data['drivers'], [NearbyDriver]);
      }
    }
    return obj;
  }


  /**
   * driver's ride type. if driver is eligable for several ride types, he will be duplicated.
   * @member {String} ride_type
   */
  exports.prototype['ride_type'] = undefined;

  /**
   * list of nearby drivers group by ride type sorted by eta
   * @member {Array.<module:model/NearbyDriver>} drivers
   */
  exports.prototype['drivers'] = undefined;




  return exports;
}));

},{"../ApiClient":7,"./NearbyDriver":30}],32:[function(require,module,exports){
(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['../ApiClient', './UserDetail'], factory);
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS-like environments that support module.exports, like Node.
    module.exports = factory(require('../ApiClient'), require('./UserDetail'));
  } else {
    // Browser globals (root is window)
    if (!root.LyftApi) {
      root.LyftApi = {};
    }
    root.LyftApi.PassengerDetail = factory(root.LyftApi.ApiClient, root.LyftApi.UserDetail);
  }
}(this, function(ApiClient, UserDetail) {
  'use strict';

  /**
   * The PassengerDetail model module.
   * @module model/PassengerDetail
   * @version 1.0.0
   */

  /**
   * Constructs a new <code>PassengerDetail</code>.
   * @alias module:model/PassengerDetail
   * @class
   * @extends module:model/UserDetail
   * @param firstName
   * @param lastName
   */
  var exports = function(firstName, lastName) {
    UserDetail.call(this, firstName, lastName);
  };

  /**
   * Constructs a <code>PassengerDetail</code> from a plain JavaScript object, optionally creating a new instance.
   * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
   * @param {Object} data The plain JavaScript object bearing properties of interest.
   * @param {module:model/PassengerDetail} obj Optional instance to populate.
   * @return {module:model/PassengerDetail} The populated <code>PassengerDetail</code> instance.
   */
  exports.constructFromObject = function(data, obj) {
    if (data) { 
      obj = obj || new exports();
      UserDetail.constructFromObject(data, obj);
    }
    return obj;
  }

  exports.prototype = Object.create(UserDetail.prototype);
  exports.prototype.constructor = exports;





  return exports;
}));

},{"../ApiClient":7,"./UserDetail":52}],33:[function(require,module,exports){
(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['../ApiClient', './Location'], factory);
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS-like environments that support module.exports, like Node.
    module.exports = factory(require('../ApiClient'), require('./Location'));
  } else {
    // Browser globals (root is window)
    if (!root.LyftApi) {
      root.LyftApi = {};
    }
    root.LyftApi.PickupDropoffLocation = factory(root.LyftApi.ApiClient, root.LyftApi.Location);
  }
}(this, function(ApiClient, Location) {
  'use strict';

  /**
   * The PickupDropoffLocation model module.
   * @module model/PickupDropoffLocation
   * @version 1.0.0
   */

  /**
   * Constructs a new <code>PickupDropoffLocation</code>.
   * @alias module:model/PickupDropoffLocation
   * @class
   * @extends module:model/Location
   * @param lat
   * @param lng
   */
  var exports = function(lat, lng) {
    Location.call(this, lat, lng);

  };

  /**
   * Constructs a <code>PickupDropoffLocation</code> from a plain JavaScript object, optionally creating a new instance.
   * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
   * @param {Object} data The plain JavaScript object bearing properties of interest.
   * @param {module:model/PickupDropoffLocation} obj Optional instance to populate.
   * @return {module:model/PickupDropoffLocation} The populated <code>PickupDropoffLocation</code> instance.
   */
  exports.constructFromObject = function(data, obj) {
    if (data) { 
      obj = obj || new exports();
      Location.constructFromObject(data, obj);
      if (data.hasOwnProperty('time')) {
        obj['time'] = ApiClient.convertToType(data['time'], 'Date');
      }
    }
    return obj;
  }

  exports.prototype = Object.create(Location.prototype);
  exports.prototype.constructor = exports;


  /**
   * Server time when the location object is created
   * @member {Date} time
   */
  exports.prototype['time'] = undefined;




  return exports;
}));

},{"../ApiClient":7,"./Location":29}],34:[function(require,module,exports){
(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['../ApiClient'], factory);
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS-like environments that support module.exports, like Node.
    module.exports = factory(require('../ApiClient'));
  } else {
    // Browser globals (root is window)
    if (!root.LyftApi) {
      root.LyftApi = {};
    }
    root.LyftApi.PricingDetails = factory(root.LyftApi.ApiClient);
  }
}(this, function(ApiClient) {
  'use strict';

  /**
   * The PricingDetails model module.
   * @module model/PricingDetails
   * @version 1.0.0
   */

  /**
   * Constructs a new <code>PricingDetails</code>.
   * @alias module:model/PricingDetails
   * @class
   */
  var exports = function() {








  };

  /**
   * Constructs a <code>PricingDetails</code> from a plain JavaScript object, optionally creating a new instance.
   * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
   * @param {Object} data The plain JavaScript object bearing properties of interest.
   * @param {module:model/PricingDetails} obj Optional instance to populate.
   * @return {module:model/PricingDetails} The populated <code>PricingDetails</code> instance.
   */
  exports.constructFromObject = function(data, obj) {
    if (data) { 
      obj = obj || new exports();

      if (data.hasOwnProperty('base_charge')) {
        obj['base_charge'] = ApiClient.convertToType(data['base_charge'], 'Integer');
      }
      if (data.hasOwnProperty('cancel_penalty_amount')) {
        obj['cancel_penalty_amount'] = ApiClient.convertToType(data['cancel_penalty_amount'], 'Integer');
      }
      if (data.hasOwnProperty('cost_minimum')) {
        obj['cost_minimum'] = ApiClient.convertToType(data['cost_minimum'], 'Integer');
      }
      if (data.hasOwnProperty('cost_per_mile')) {
        obj['cost_per_mile'] = ApiClient.convertToType(data['cost_per_mile'], 'Integer');
      }
      if (data.hasOwnProperty('cost_per_minute')) {
        obj['cost_per_minute'] = ApiClient.convertToType(data['cost_per_minute'], 'Integer');
      }
      if (data.hasOwnProperty('currency')) {
        obj['currency'] = ApiClient.convertToType(data['currency'], 'String');
      }
      if (data.hasOwnProperty('trust_and_service')) {
        obj['trust_and_service'] = ApiClient.convertToType(data['trust_and_service'], 'Integer');
      }
    }
    return obj;
  }


  /**
   * The base charge of the trip
   * @member {Integer} base_charge
   */
  exports.prototype['base_charge'] = undefined;

  /**
   * The charge amount if cancel penalty is involved
   * @member {Integer} cancel_penalty_amount
   */
  exports.prototype['cancel_penalty_amount'] = undefined;

  /**
   * The minimum charge for the trip
   * @member {Integer} cost_minimum
   */
  exports.prototype['cost_minimum'] = undefined;

  /**
   * The cost per mile
   * @member {Integer} cost_per_mile
   */
  exports.prototype['cost_per_mile'] = undefined;

  /**
   * The cost per minute
   * @member {Integer} cost_per_minute
   */
  exports.prototype['cost_per_minute'] = undefined;

  /**
   * The ISO 4217 currency code for the amount (e.g. USD)
   * @member {String} currency
   */
  exports.prototype['currency'] = undefined;

  /**
   * Trust and service fee
   * @member {Integer} trust_and_service
   */
  exports.prototype['trust_and_service'] = undefined;




  return exports;
}));

},{"../ApiClient":7}],35:[function(require,module,exports){
(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['../ApiClient', './TipParams'], factory);
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS-like environments that support module.exports, like Node.
    module.exports = factory(require('../ApiClient'), require('./TipParams'));
  } else {
    // Browser globals (root is window)
    if (!root.LyftApi) {
      root.LyftApi = {};
    }
    root.LyftApi.RatingRequest = factory(root.LyftApi.ApiClient, root.LyftApi.TipParams);
  }
}(this, function(ApiClient, TipParams) {
  'use strict';

  /**
   * The RatingRequest model module.
   * @module model/RatingRequest
   * @version 1.0.0
   */

  /**
   * Constructs a new <code>RatingRequest</code>.
   * Rating and optional feedback and tip
   * @alias module:model/RatingRequest
   * @class
   * @param rating
   */
  var exports = function(rating) {

    this['rating'] = rating;


  };

  /**
   * Constructs a <code>RatingRequest</code> from a plain JavaScript object, optionally creating a new instance.
   * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
   * @param {Object} data The plain JavaScript object bearing properties of interest.
   * @param {module:model/RatingRequest} obj Optional instance to populate.
   * @return {module:model/RatingRequest} The populated <code>RatingRequest</code> instance.
   */
  exports.constructFromObject = function(data, obj) {
    if (data) { 
      obj = obj || new exports();

      if (data.hasOwnProperty('rating')) {
        obj['rating'] = ApiClient.convertToType(data['rating'], 'Integer');
      }
      if (data.hasOwnProperty('feedback')) {
        obj['feedback'] = ApiClient.convertToType(data['feedback'], 'String');
      }
      if (data.hasOwnProperty('tip')) {
        obj['tip'] = TipParams.constructFromObject(data['tip']);
      }
    }
    return obj;
  }


  /**
   * The passenger's rating of this ride from 1 to 5
   * @member {Integer} rating
   */
  exports.prototype['rating'] = undefined;

  /**
   * The passenger's written feedback about this ride
   * @member {String} feedback
   */
  exports.prototype['feedback'] = undefined;

  /**
   * Tip amount in minor units and tip currency
   * @member {module:model/TipParams} tip
   */
  exports.prototype['tip'] = undefined;




  return exports;
}));

},{"../ApiClient":7,"./TipParams":51}],36:[function(require,module,exports){
(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['../ApiClient', './Location', './RideTypeEnum'], factory);
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS-like environments that support module.exports, like Node.
    module.exports = factory(require('../ApiClient'), require('./Location'), require('./RideTypeEnum'));
  } else {
    // Browser globals (root is window)
    if (!root.LyftApi) {
      root.LyftApi = {};
    }
    root.LyftApi.Ride = factory(root.LyftApi.ApiClient, root.LyftApi.Location, root.LyftApi.RideTypeEnum);
  }
}(this, function(ApiClient, Location, RideTypeEnum) {
  'use strict';

  /**
   * The Ride model module.
   * @module model/Ride
   * @version 1.0.0
   */

  /**
   * Constructs a new <code>Ride</code>.
   * Represents a requested, ongoing, or finished Lyft ride
   * @alias module:model/Ride
   * @class
   * @param rideType
   * @param origin
   */
  var exports = function(rideType, origin) {


    this['ride_type'] = rideType;
    this['origin'] = origin;


  };

  /**
   * Constructs a <code>Ride</code> from a plain JavaScript object, optionally creating a new instance.
   * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
   * @param {Object} data The plain JavaScript object bearing properties of interest.
   * @param {module:model/Ride} obj Optional instance to populate.
   * @return {module:model/Ride} The populated <code>Ride</code> instance.
   */
  exports.constructFromObject = function(data, obj) {
    if (data) { 
      obj = obj || new exports();

      if (data.hasOwnProperty('ride_id')) {
        obj['ride_id'] = ApiClient.convertToType(data['ride_id'], 'String');
      }
      if (data.hasOwnProperty('ride_type')) {
        obj['ride_type'] = RideTypeEnum.constructFromObject(data['ride_type']);
      }
      if (data.hasOwnProperty('origin')) {
        obj['origin'] = Location.constructFromObject(data['origin']);
      }
      if (data.hasOwnProperty('destination')) {
        obj['destination'] = Location.constructFromObject(data['destination']);
      }
      if (data.hasOwnProperty('primetime_confirmation_token')) {
        obj['primetime_confirmation_token'] = ApiClient.convertToType(data['primetime_confirmation_token'], 'String');
      }
    }
    return obj;
  }


  /**
   * The unique ID of this ride
   * @member {String} ride_id
   */
  exports.prototype['ride_id'] = undefined;

  /**
   * @member {module:model/RideTypeEnum} ride_type
   */
  exports.prototype['ride_type'] = undefined;

  /**
   * The *requested* location for passenger pickup
   * @member {module:model/Location} origin
   */
  exports.prototype['origin'] = undefined;

  /**
   * The *requested* location for passenger drop off
   * @member {module:model/Location} destination
   */
  exports.prototype['destination'] = undefined;

  /**
   * A token that confirms the user has accepted current primetime charges
   * @member {String} primetime_confirmation_token
   */
  exports.prototype['primetime_confirmation_token'] = undefined;




  return exports;
}));

},{"../ApiClient":7,"./Location":29,"./RideTypeEnum":44}],37:[function(require,module,exports){
(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['../ApiClient', './CancellationCost', './Cost', './DriverDetail', './LineItem', './PassengerDetail', './PickupDropoffLocation', './RideLocation', './RideStatusEnum', './RideTypeEnumWithOther', './VehicleDetail'], factory);
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS-like environments that support module.exports, like Node.
    module.exports = factory(require('../ApiClient'), require('./CancellationCost'), require('./Cost'), require('./DriverDetail'), require('./LineItem'), require('./PassengerDetail'), require('./PickupDropoffLocation'), require('./RideLocation'), require('./RideStatusEnum'), require('./RideTypeEnumWithOther'), require('./VehicleDetail'));
  } else {
    // Browser globals (root is window)
    if (!root.LyftApi) {
      root.LyftApi = {};
    }
    root.LyftApi.RideDetail = factory(root.LyftApi.ApiClient, root.LyftApi.CancellationCost, root.LyftApi.Cost, root.LyftApi.DriverDetail, root.LyftApi.LineItem, root.LyftApi.PassengerDetail, root.LyftApi.PickupDropoffLocation, root.LyftApi.RideLocation, root.LyftApi.RideStatusEnum, root.LyftApi.RideTypeEnumWithOther, root.LyftApi.VehicleDetail);
  }
}(this, function(ApiClient, CancellationCost, Cost, DriverDetail, LineItem, PassengerDetail, PickupDropoffLocation, RideLocation, RideStatusEnum, RideTypeEnumWithOther, VehicleDetail) {
  'use strict';

  /**
   * The RideDetail model module.
   * @module model/RideDetail
   * @version 1.0.0
   */

  /**
   * Constructs a new <code>RideDetail</code>.
   * Detail information about a ride
   * @alias module:model/RideDetail
   * @class
   */
  var exports = function() {






















  };

  /**
   * Constructs a <code>RideDetail</code> from a plain JavaScript object, optionally creating a new instance.
   * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
   * @param {Object} data The plain JavaScript object bearing properties of interest.
   * @param {module:model/RideDetail} obj Optional instance to populate.
   * @return {module:model/RideDetail} The populated <code>RideDetail</code> instance.
   */
  exports.constructFromObject = function(data, obj) {
    if (data) { 
      obj = obj || new exports();

      if (data.hasOwnProperty('ride_id')) {
        obj['ride_id'] = ApiClient.convertToType(data['ride_id'], 'String');
      }
      if (data.hasOwnProperty('status')) {
        obj['status'] = RideStatusEnum.constructFromObject(data['status']);
      }
      if (data.hasOwnProperty('ride_type')) {
        obj['ride_type'] = RideTypeEnumWithOther.constructFromObject(data['ride_type']);
      }
      if (data.hasOwnProperty('passenger')) {
        obj['passenger'] = PassengerDetail.constructFromObject(data['passenger']);
      }
      if (data.hasOwnProperty('driver')) {
        obj['driver'] = DriverDetail.constructFromObject(data['driver']);
      }
      if (data.hasOwnProperty('vehicle')) {
        obj['vehicle'] = VehicleDetail.constructFromObject(data['vehicle']);
      }
      if (data.hasOwnProperty('origin')) {
        obj['origin'] = RideLocation.constructFromObject(data['origin']);
      }
      if (data.hasOwnProperty('destination')) {
        obj['destination'] = RideLocation.constructFromObject(data['destination']);
      }
      if (data.hasOwnProperty('pickup')) {
        obj['pickup'] = PickupDropoffLocation.constructFromObject(data['pickup']);
      }
      if (data.hasOwnProperty('dropoff')) {
        obj['dropoff'] = PickupDropoffLocation.constructFromObject(data['dropoff']);
      }
      if (data.hasOwnProperty('location')) {
        obj['location'] = RideLocation.constructFromObject(data['location']);
      }
      if (data.hasOwnProperty('primetime_percentage')) {
        obj['primetime_percentage'] = ApiClient.convertToType(data['primetime_percentage'], 'String');
      }
      if (data.hasOwnProperty('price')) {
        obj['price'] = Cost.constructFromObject(data['price']);
      }
      if (data.hasOwnProperty('line_items')) {
        obj['line_items'] = ApiClient.convertToType(data['line_items'], [LineItem]);
      }
      if (data.hasOwnProperty('can_cancel')) {
        obj['can_cancel'] = ApiClient.convertToType(data['can_cancel'], ['String']);
      }
      if (data.hasOwnProperty('canceled_by')) {
        obj['canceled_by'] = ApiClient.convertToType(data['canceled_by'], 'String');
      }
      if (data.hasOwnProperty('cancellation_price')) {
        obj['cancellation_price'] = CancellationCost.constructFromObject(data['cancellation_price']);
      }
      if (data.hasOwnProperty('rating')) {
        obj['rating'] = ApiClient.convertToType(data['rating'], 'Integer');
      }
      if (data.hasOwnProperty('feedback')) {
        obj['feedback'] = ApiClient.convertToType(data['feedback'], 'String');
      }
      if (data.hasOwnProperty('route_url')) {
        obj['route_url'] = ApiClient.convertToType(data['route_url'], 'String');
      }
      if (data.hasOwnProperty('requested_at')) {
        obj['requested_at'] = ApiClient.convertToType(data['requested_at'], 'Date');
      }
    }
    return obj;
  }


  /**
   * The unique ID of this ride
   * @member {String} ride_id
   */
  exports.prototype['ride_id'] = undefined;

  /**
   * @member {module:model/RideStatusEnum} status
   */
  exports.prototype['status'] = undefined;

  /**
   * @member {module:model/RideTypeEnumWithOther} ride_type
   */
  exports.prototype['ride_type'] = undefined;

  /**
   * The passenger details
   * @member {module:model/PassengerDetail} passenger
   */
  exports.prototype['passenger'] = undefined;

  /**
   * The driver details
   * @member {module:model/DriverDetail} driver
   */
  exports.prototype['driver'] = undefined;

  /**
   * The vehicle details
   * @member {module:model/VehicleDetail} vehicle
   */
  exports.prototype['vehicle'] = undefined;

  /**
   * The *requested* location for passenger pickup
   * @member {module:model/RideLocation} origin
   */
  exports.prototype['origin'] = undefined;

  /**
   * The *requested* location for passenger drop off
   * @member {module:model/RideLocation} destination
   */
  exports.prototype['destination'] = undefined;

  /**
   * The *actual* location of passenger pickup
   * @member {module:model/PickupDropoffLocation} pickup
   */
  exports.prototype['pickup'] = undefined;

  /**
   * The *actual* location of passenger drop off
   * @member {module:model/PickupDropoffLocation} dropoff
   */
  exports.prototype['dropoff'] = undefined;

  /**
   * The *current* location info of the ride
   * @member {module:model/RideLocation} location
   */
  exports.prototype['location'] = undefined;

  /**
   * The Prime Time percentage applied to the base price
   * @member {String} primetime_percentage
   */
  exports.prototype['primetime_percentage'] = undefined;

  /**
   * The total price for the current ride
   * @member {module:model/Cost} price
   */
  exports.prototype['price'] = undefined;

  /**
   * The break down of cost
   * @member {Array.<module:model/LineItem>} line_items
   */
  exports.prototype['line_items'] = undefined;

  /**
   * @member {Array.<module:model/RideDetail.CanCancelEnum>} can_cancel
   */
  exports.prototype['can_cancel'] = undefined;

  /**
   * The role of user who canceled the ride (if applicable)
   * @member {String} canceled_by
   */
  exports.prototype['canceled_by'] = undefined;

  /**
   * The cost of cancellation if there would be a penalty
   * @member {module:model/CancellationCost} cancellation_price
   */
  exports.prototype['cancellation_price'] = undefined;

  /**
   * The rating the user left for this ride, from 1 to 5
   * @member {Integer} rating
   */
  exports.prototype['rating'] = undefined;

  /**
   * The written feedback the user left for this ride
   * @member {String} feedback
   */
  exports.prototype['feedback'] = undefined;

  /**
   * The web view showing the passenger, driver, and route for this ride. This field will only be present for rides created through this API, or that have been shared through the \"Share my Route\" feature\n
   * @member {String} route_url
   */
  exports.prototype['route_url'] = undefined;

  /**
   * The ride requested timestamp in date and time
   * @member {Date} requested_at
   */
  exports.prototype['requested_at'] = undefined;



  /**
   * Allowed values for the <code>canCancel</code> property.
   * @enum {String}
   * @readonly
   */
  exports.CanCancelEnum = { 
    /**
     * value: driver
     * @const
     */
    DRIVER: "driver",
    
    /**
     * value: passenger
     * @const
     */
    PASSENGER: "passenger",
    
    /**
     * value: dispatcher
     * @const
     */
    DISPATCHER: "dispatcher"
  };

  return exports;
}));

},{"../ApiClient":7,"./CancellationCost":12,"./Cost":16,"./DriverDetail":18,"./LineItem":28,"./PassengerDetail":32,"./PickupDropoffLocation":33,"./RideLocation":38,"./RideStatusEnum":42,"./RideTypeEnumWithOther":45,"./VehicleDetail":53}],38:[function(require,module,exports){
(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['../ApiClient', './Location'], factory);
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS-like environments that support module.exports, like Node.
    module.exports = factory(require('../ApiClient'), require('./Location'));
  } else {
    // Browser globals (root is window)
    if (!root.LyftApi) {
      root.LyftApi = {};
    }
    root.LyftApi.RideLocation = factory(root.LyftApi.ApiClient, root.LyftApi.Location);
  }
}(this, function(ApiClient, Location) {
  'use strict';

  /**
   * The RideLocation model module.
   * @module model/RideLocation
   * @version 1.0.0
   */

  /**
   * Constructs a new <code>RideLocation</code>.
   * @alias module:model/RideLocation
   * @class
   * @extends module:model/Location
   * @param lat
   * @param lng
   */
  var exports = function(lat, lng) {
    Location.call(this, lat, lng);

  };

  /**
   * Constructs a <code>RideLocation</code> from a plain JavaScript object, optionally creating a new instance.
   * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
   * @param {Object} data The plain JavaScript object bearing properties of interest.
   * @param {module:model/RideLocation} obj Optional instance to populate.
   * @return {module:model/RideLocation} The populated <code>RideLocation</code> instance.
   */
  exports.constructFromObject = function(data, obj) {
    if (data) { 
      obj = obj || new exports();
      Location.constructFromObject(data, obj);
      if (data.hasOwnProperty('eta_seconds')) {
        obj['eta_seconds'] = ApiClient.convertToType(data['eta_seconds'], 'Integer');
      }
    }
    return obj;
  }

  exports.prototype = Object.create(Location.prototype);
  exports.prototype.constructor = exports;


  /**
   * Estimated seconds for a driver to pickup or reach destination based on ride state
   * @member {Integer} eta_seconds
   */
  exports.prototype['eta_seconds'] = undefined;




  return exports;
}));

},{"../ApiClient":7,"./Location":29}],39:[function(require,module,exports){
(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['../ApiClient', './Charge', './Cost', './LineItem'], factory);
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS-like environments that support module.exports, like Node.
    module.exports = factory(require('../ApiClient'), require('./Charge'), require('./Cost'), require('./LineItem'));
  } else {
    // Browser globals (root is window)
    if (!root.LyftApi) {
      root.LyftApi = {};
    }
    root.LyftApi.RideReceipt = factory(root.LyftApi.ApiClient, root.LyftApi.Charge, root.LyftApi.Cost, root.LyftApi.LineItem);
  }
}(this, function(ApiClient, Charge, Cost, LineItem) {
  'use strict';

  /**
   * The RideReceipt model module.
   * @module model/RideReceipt
   * @version 1.0.0
   */

  /**
   * Constructs a new <code>RideReceipt</code>.
   * Receipt information of a processed ride.
   * @alias module:model/RideReceipt
   * @class
   */
  var exports = function() {






  };

  /**
   * Constructs a <code>RideReceipt</code> from a plain JavaScript object, optionally creating a new instance.
   * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
   * @param {Object} data The plain JavaScript object bearing properties of interest.
   * @param {module:model/RideReceipt} obj Optional instance to populate.
   * @return {module:model/RideReceipt} The populated <code>RideReceipt</code> instance.
   */
  exports.constructFromObject = function(data, obj) {
    if (data) { 
      obj = obj || new exports();

      if (data.hasOwnProperty('ride_id')) {
        obj['ride_id'] = ApiClient.convertToType(data['ride_id'], 'String');
      }
      if (data.hasOwnProperty('price')) {
        obj['price'] = Cost.constructFromObject(data['price']);
      }
      if (data.hasOwnProperty('line_items')) {
        obj['line_items'] = ApiClient.convertToType(data['line_items'], [LineItem]);
      }
      if (data.hasOwnProperty('charges')) {
        obj['charges'] = ApiClient.convertToType(data['charges'], [Charge]);
      }
      if (data.hasOwnProperty('requested_at')) {
        obj['requested_at'] = ApiClient.convertToType(data['requested_at'], 'Date');
      }
    }
    return obj;
  }


  /**
   * The unique ID of this ride
   * @member {String} ride_id
   */
  exports.prototype['ride_id'] = undefined;

  /**
   * The total price for the current ride
   * @member {module:model/Cost} price
   */
  exports.prototype['price'] = undefined;

  /**
   * The break down of line items
   * @member {Array.<module:model/LineItem>} line_items
   */
  exports.prototype['line_items'] = undefined;

  /**
   * The break down of charge method
   * @member {Array.<module:model/Charge>} charges
   */
  exports.prototype['charges'] = undefined;

  /**
   * The ride requested timestamp in date and time
   * @member {Date} requested_at
   */
  exports.prototype['requested_at'] = undefined;




  return exports;
}));

},{"../ApiClient":7,"./Charge":15,"./Cost":16,"./LineItem":28}],40:[function(require,module,exports){
(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['../ApiClient', './Location', './PassengerDetail', './RideStatusEnum'], factory);
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS-like environments that support module.exports, like Node.
    module.exports = factory(require('../ApiClient'), require('./Location'), require('./PassengerDetail'), require('./RideStatusEnum'));
  } else {
    // Browser globals (root is window)
    if (!root.LyftApi) {
      root.LyftApi = {};
    }
    root.LyftApi.RideRequest = factory(root.LyftApi.ApiClient, root.LyftApi.Location, root.LyftApi.PassengerDetail, root.LyftApi.RideStatusEnum);
  }
}(this, function(ApiClient, Location, PassengerDetail, RideStatusEnum) {
  'use strict';

  /**
   * The RideRequest model module.
   * @module model/RideRequest
   * @version 1.0.0
   */

  /**
   * Constructs a new <code>RideRequest</code>.
   * Minimal set of ride details
   * @alias module:model/RideRequest
   * @class
   */
  var exports = function() {






  };

  /**
   * Constructs a <code>RideRequest</code> from a plain JavaScript object, optionally creating a new instance.
   * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
   * @param {Object} data The plain JavaScript object bearing properties of interest.
   * @param {module:model/RideRequest} obj Optional instance to populate.
   * @return {module:model/RideRequest} The populated <code>RideRequest</code> instance.
   */
  exports.constructFromObject = function(data, obj) {
    if (data) { 
      obj = obj || new exports();

      if (data.hasOwnProperty('ride_id')) {
        obj['ride_id'] = ApiClient.convertToType(data['ride_id'], 'String');
      }
      if (data.hasOwnProperty('status')) {
        obj['status'] = RideStatusEnum.constructFromObject(data['status']);
      }
      if (data.hasOwnProperty('origin')) {
        obj['origin'] = Location.constructFromObject(data['origin']);
      }
      if (data.hasOwnProperty('destination')) {
        obj['destination'] = Location.constructFromObject(data['destination']);
      }
      if (data.hasOwnProperty('passenger')) {
        obj['passenger'] = PassengerDetail.constructFromObject(data['passenger']);
      }
    }
    return obj;
  }


  /**
   * The ID of the requested ride
   * @member {String} ride_id
   */
  exports.prototype['ride_id'] = undefined;

  /**
   * @member {module:model/RideStatusEnum} status
   */
  exports.prototype['status'] = undefined;

  /**
   * The *requested* location for passenger pickup
   * @member {module:model/Location} origin
   */
  exports.prototype['origin'] = undefined;

  /**
   * The *requested* location for passenger drop off
   * @member {module:model/Location} destination
   */
  exports.prototype['destination'] = undefined;

  /**
   * @member {module:model/PassengerDetail} passenger
   */
  exports.prototype['passenger'] = undefined;




  return exports;
}));

},{"../ApiClient":7,"./Location":29,"./PassengerDetail":32,"./RideStatusEnum":42}],41:[function(require,module,exports){
(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['../ApiClient', './ErrorDetail'], factory);
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS-like environments that support module.exports, like Node.
    module.exports = factory(require('../ApiClient'), require('./ErrorDetail'));
  } else {
    // Browser globals (root is window)
    if (!root.LyftApi) {
      root.LyftApi = {};
    }
    root.LyftApi.RideRequestError = factory(root.LyftApi.ApiClient, root.LyftApi.ErrorDetail);
  }
}(this, function(ApiClient, ErrorDetail) {
  'use strict';

  /**
   * The RideRequestError model module.
   * @module model/RideRequestError
   * @version 1.0.0
   */

  /**
   * Constructs a new <code>RideRequestError</code>.
   * Details about why a request failed, such as missing or invalid parameters
   * @alias module:model/RideRequestError
   * @class
   * @param error
   */
  var exports = function(error) {

    this['error'] = error;





  };

  /**
   * Constructs a <code>RideRequestError</code> from a plain JavaScript object, optionally creating a new instance.
   * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
   * @param {Object} data The plain JavaScript object bearing properties of interest.
   * @param {module:model/RideRequestError} obj Optional instance to populate.
   * @return {module:model/RideRequestError} The populated <code>RideRequestError</code> instance.
   */
  exports.constructFromObject = function(data, obj) {
    if (data) { 
      obj = obj || new exports();

      if (data.hasOwnProperty('error')) {
        obj['error'] = ApiClient.convertToType(data['error'], 'String');
      }
      if (data.hasOwnProperty('error_detail')) {
        obj['error_detail'] = ApiClient.convertToType(data['error_detail'], [ErrorDetail]);
      }
      if (data.hasOwnProperty('error_description')) {
        obj['error_description'] = ApiClient.convertToType(data['error_description'], 'String');
      }
      if (data.hasOwnProperty('primetime_percentage')) {
        obj['primetime_percentage'] = ApiClient.convertToType(data['primetime_percentage'], 'String');
      }
      if (data.hasOwnProperty('primetime_confirmation_token')) {
        obj['primetime_confirmation_token'] = ApiClient.convertToType(data['primetime_confirmation_token'], 'String');
      }
      if (data.hasOwnProperty('token_duration')) {
        obj['token_duration'] = ApiClient.convertToType(data['token_duration'], 'String');
      }
    }
    return obj;
  }


  /**
   * A \"slug\" that serves as the error code (eg. \"bad_parameter\")
   * @member {String} error
   */
  exports.prototype['error'] = undefined;

  /**
   * @member {Array.<module:model/ErrorDetail>} error_detail
   */
  exports.prototype['error_detail'] = undefined;

  /**
   * A user-friendly description of the error (appropriate to show to an end-user)
   * @member {String} error_description
   */
  exports.prototype['error_description'] = undefined;

  /**
   * Current Prime Time percentage
   * @member {String} primetime_percentage
   */
  exports.prototype['primetime_percentage'] = undefined;

  /**
   * A token that confirms the user has accepted current Prime Time charges
   * @member {String} primetime_confirmation_token
   */
  exports.prototype['primetime_confirmation_token'] = undefined;

  /**
   * Validity of the token in seconds
   * @member {String} token_duration
   */
  exports.prototype['token_duration'] = undefined;




  return exports;
}));

},{"../ApiClient":7,"./ErrorDetail":20}],42:[function(require,module,exports){
(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['../ApiClient'], factory);
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS-like environments that support module.exports, like Node.
    module.exports = factory(require('../ApiClient'));
  } else {
    // Browser globals (root is window)
    if (!root.LyftApi) {
      root.LyftApi = {};
    }
    root.LyftApi.RideStatusEnum = factory(root.LyftApi.ApiClient);
  }
}(this, function(ApiClient) {
  'use strict';

  /**
   * The RideStatusEnum model module.
   * @module model/RideStatusEnum
   * @version 1.0.0
   */

  /**
   * Constructs a new <code>RideStatusEnum</code>.
   * The current status of the ride
   * @alias module:model/RideStatusEnum
   * @class
   */
  var exports = function() {

  };

  /**
   * Constructs a <code>RideStatusEnum</code> from a plain JavaScript object, optionally creating a new instance.
   * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
   * @param {Object} data The plain JavaScript object bearing properties of interest.
   * @param {module:model/RideStatusEnum} obj Optional instance to populate.
   * @return {module:model/RideStatusEnum} The populated <code>RideStatusEnum</code> instance.
   */
  exports.constructFromObject = function(data, obj) {
    if (data) { 
      obj = obj || new exports();

    }
    return obj;
  }





  return exports;
}));

},{"../ApiClient":7}],43:[function(require,module,exports){
(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['../ApiClient', './PricingDetails', './RideTypeEnum'], factory);
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS-like environments that support module.exports, like Node.
    module.exports = factory(require('../ApiClient'), require('./PricingDetails'), require('./RideTypeEnum'));
  } else {
    // Browser globals (root is window)
    if (!root.LyftApi) {
      root.LyftApi = {};
    }
    root.LyftApi.RideType = factory(root.LyftApi.ApiClient, root.LyftApi.PricingDetails, root.LyftApi.RideTypeEnum);
  }
}(this, function(ApiClient, PricingDetails, RideTypeEnum) {
  'use strict';

  /**
   * The RideType model module.
   * @module model/RideType
   * @version 1.0.0
   */

  /**
   * Constructs a new <code>RideType</code>.
   * @alias module:model/RideType
   * @class
   */
  var exports = function() {






  };

  /**
   * Constructs a <code>RideType</code> from a plain JavaScript object, optionally creating a new instance.
   * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
   * @param {Object} data The plain JavaScript object bearing properties of interest.
   * @param {module:model/RideType} obj Optional instance to populate.
   * @return {module:model/RideType} The populated <code>RideType</code> instance.
   */
  exports.constructFromObject = function(data, obj) {
    if (data) { 
      obj = obj || new exports();

      if (data.hasOwnProperty('ride_type')) {
        obj['ride_type'] = RideTypeEnum.constructFromObject(data['ride_type']);
      }
      if (data.hasOwnProperty('display_name')) {
        obj['display_name'] = ApiClient.convertToType(data['display_name'], 'String');
      }
      if (data.hasOwnProperty('seats')) {
        obj['seats'] = ApiClient.convertToType(data['seats'], 'Integer');
      }
      if (data.hasOwnProperty('image_url')) {
        obj['image_url'] = ApiClient.convertToType(data['image_url'], 'String');
      }
      if (data.hasOwnProperty('pricing_details')) {
        obj['pricing_details'] = PricingDetails.constructFromObject(data['pricing_details']);
      }
    }
    return obj;
  }


  /**
   * @member {module:model/RideTypeEnum} ride_type
   */
  exports.prototype['ride_type'] = undefined;

  /**
   * A human readable description of the ride type
   * @member {String} display_name
   */
  exports.prototype['display_name'] = undefined;

  /**
   * The maximum number of seats available for rides requested with this ride type
   * @member {Integer} seats
   */
  exports.prototype['seats'] = undefined;

  /**
   * The URL of an image representing this ride type
   * @member {String} image_url
   */
  exports.prototype['image_url'] = undefined;

  /**
   * @member {module:model/PricingDetails} pricing_details
   */
  exports.prototype['pricing_details'] = undefined;




  return exports;
}));

},{"../ApiClient":7,"./PricingDetails":34,"./RideTypeEnum":44}],44:[function(require,module,exports){
(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['../ApiClient'], factory);
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS-like environments that support module.exports, like Node.
    module.exports = factory(require('../ApiClient'));
  } else {
    // Browser globals (root is window)
    if (!root.LyftApi) {
      root.LyftApi = {};
    }
    root.LyftApi.RideTypeEnum = factory(root.LyftApi.ApiClient);
  }
}(this, function(ApiClient) {
  'use strict';

  /**
   * The RideTypeEnum model module.
   * @module model/RideTypeEnum
   * @version 1.0.0
   */

  /**
   * Constructs a new <code>RideTypeEnum</code>.
   * The ID of the ride type
   * @alias module:model/RideTypeEnum
   * @class
   */
  var exports = function() {

  };

  /**
   * Constructs a <code>RideTypeEnum</code> from a plain JavaScript object, optionally creating a new instance.
   * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
   * @param {Object} data The plain JavaScript object bearing properties of interest.
   * @param {module:model/RideTypeEnum} obj Optional instance to populate.
   * @return {module:model/RideTypeEnum} The populated <code>RideTypeEnum</code> instance.
   */
  exports.constructFromObject = function(data, obj) {
    if (data) { 
      obj = obj || new exports();

    }
    return obj;
  }





  return exports;
}));

},{"../ApiClient":7}],45:[function(require,module,exports){
(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['../ApiClient'], factory);
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS-like environments that support module.exports, like Node.
    module.exports = factory(require('../ApiClient'));
  } else {
    // Browser globals (root is window)
    if (!root.LyftApi) {
      root.LyftApi = {};
    }
    root.LyftApi.RideTypeEnumWithOther = factory(root.LyftApi.ApiClient);
  }
}(this, function(ApiClient) {
  'use strict';

  /**
   * The RideTypeEnumWithOther model module.
   * @module model/RideTypeEnumWithOther
   * @version 1.0.0
   */

  /**
   * Constructs a new <code>RideTypeEnumWithOther</code>.
   * The ID of the ride type
   * @alias module:model/RideTypeEnumWithOther
   * @class
   */
  var exports = function() {

  };

  /**
   * Constructs a <code>RideTypeEnumWithOther</code> from a plain JavaScript object, optionally creating a new instance.
   * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
   * @param {Object} data The plain JavaScript object bearing properties of interest.
   * @param {module:model/RideTypeEnumWithOther} obj Optional instance to populate.
   * @return {module:model/RideTypeEnumWithOther} The populated <code>RideTypeEnumWithOther</code> instance.
   */
  exports.constructFromObject = function(data, obj) {
    if (data) { 
      obj = obj || new exports();

    }
    return obj;
  }





  return exports;
}));

},{"../ApiClient":7}],46:[function(require,module,exports){
(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['../ApiClient'], factory);
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS-like environments that support module.exports, like Node.
    module.exports = factory(require('../ApiClient'));
  } else {
    // Browser globals (root is window)
    if (!root.LyftApi) {
      root.LyftApi = {};
    }
    root.LyftApi.SandboxDriverAvailability = factory(root.LyftApi.ApiClient);
  }
}(this, function(ApiClient) {
  'use strict';

  /**
   * The SandboxDriverAvailability model module.
   * @module model/SandboxDriverAvailability
   * @version 1.0.0
   */

  /**
   * Constructs a new <code>SandboxDriverAvailability</code>.
   * @alias module:model/SandboxDriverAvailability
   * @class
   * @param lat
   * @param lng
   * @param driverAvailability
   */
  var exports = function(lat, lng, driverAvailability) {

    this['lat'] = lat;
    this['lng'] = lng;
    this['driver_availability'] = driverAvailability;
  };

  /**
   * Constructs a <code>SandboxDriverAvailability</code> from a plain JavaScript object, optionally creating a new instance.
   * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
   * @param {Object} data The plain JavaScript object bearing properties of interest.
   * @param {module:model/SandboxDriverAvailability} obj Optional instance to populate.
   * @return {module:model/SandboxDriverAvailability} The populated <code>SandboxDriverAvailability</code> instance.
   */
  exports.constructFromObject = function(data, obj) {
    if (data) { 
      obj = obj || new exports();

      if (data.hasOwnProperty('lat')) {
        obj['lat'] = ApiClient.convertToType(data['lat'], 'Number');
      }
      if (data.hasOwnProperty('lng')) {
        obj['lng'] = ApiClient.convertToType(data['lng'], 'Number');
      }
      if (data.hasOwnProperty('driver_availability')) {
        obj['driver_availability'] = ApiClient.convertToType(data['driver_availability'], 'Boolean');
      }
    }
    return obj;
  }


  /**
   * The latitude component of a location
   * @member {Number} lat
   */
  exports.prototype['lat'] = undefined;

  /**
   * The longitude component of a location
   * @member {Number} lng
   */
  exports.prototype['lng'] = undefined;

  /**
   * The availability of driver in a region
   * @member {Boolean} driver_availability
   */
  exports.prototype['driver_availability'] = undefined;




  return exports;
}));

},{"../ApiClient":7}],47:[function(require,module,exports){
(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['../ApiClient'], factory);
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS-like environments that support module.exports, like Node.
    module.exports = factory(require('../ApiClient'));
  } else {
    // Browser globals (root is window)
    if (!root.LyftApi) {
      root.LyftApi = {};
    }
    root.LyftApi.SandboxPrimetime = factory(root.LyftApi.ApiClient);
  }
}(this, function(ApiClient) {
  'use strict';

  /**
   * The SandboxPrimetime model module.
   * @module model/SandboxPrimetime
   * @version 1.0.0
   */

  /**
   * Constructs a new <code>SandboxPrimetime</code>.
   * @alias module:model/SandboxPrimetime
   * @class
   * @param lat
   * @param lng
   * @param primetimePercentage
   */
  var exports = function(lat, lng, primetimePercentage) {

    this['lat'] = lat;
    this['lng'] = lng;
    this['primetime_percentage'] = primetimePercentage;
  };

  /**
   * Constructs a <code>SandboxPrimetime</code> from a plain JavaScript object, optionally creating a new instance.
   * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
   * @param {Object} data The plain JavaScript object bearing properties of interest.
   * @param {module:model/SandboxPrimetime} obj Optional instance to populate.
   * @return {module:model/SandboxPrimetime} The populated <code>SandboxPrimetime</code> instance.
   */
  exports.constructFromObject = function(data, obj) {
    if (data) { 
      obj = obj || new exports();

      if (data.hasOwnProperty('lat')) {
        obj['lat'] = ApiClient.convertToType(data['lat'], 'Number');
      }
      if (data.hasOwnProperty('lng')) {
        obj['lng'] = ApiClient.convertToType(data['lng'], 'Number');
      }
      if (data.hasOwnProperty('primetime_percentage')) {
        obj['primetime_percentage'] = ApiClient.convertToType(data['primetime_percentage'], 'String');
      }
    }
    return obj;
  }


  /**
   * The latitude component of a location
   * @member {Number} lat
   */
  exports.prototype['lat'] = undefined;

  /**
   * The longitude component of a location
   * @member {Number} lng
   */
  exports.prototype['lng'] = undefined;

  /**
   * The Prime Time to be applied as a string, e.g., '25%'
   * @member {String} primetime_percentage
   */
  exports.prototype['primetime_percentage'] = undefined;




  return exports;
}));

},{"../ApiClient":7}],48:[function(require,module,exports){
(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['../ApiClient', './RideTypeEnum'], factory);
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS-like environments that support module.exports, like Node.
    module.exports = factory(require('../ApiClient'), require('./RideTypeEnum'));
  } else {
    // Browser globals (root is window)
    if (!root.LyftApi) {
      root.LyftApi = {};
    }
    root.LyftApi.SandboxRideType = factory(root.LyftApi.ApiClient, root.LyftApi.RideTypeEnum);
  }
}(this, function(ApiClient, RideTypeEnum) {
  'use strict';

  /**
   * The SandboxRideType model module.
   * @module model/SandboxRideType
   * @version 1.0.0
   */

  /**
   * Constructs a new <code>SandboxRideType</code>.
   * @alias module:model/SandboxRideType
   * @class
   */
  var exports = function() {




  };

  /**
   * Constructs a <code>SandboxRideType</code> from a plain JavaScript object, optionally creating a new instance.
   * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
   * @param {Object} data The plain JavaScript object bearing properties of interest.
   * @param {module:model/SandboxRideType} obj Optional instance to populate.
   * @return {module:model/SandboxRideType} The populated <code>SandboxRideType</code> instance.
   */
  exports.constructFromObject = function(data, obj) {
    if (data) { 
      obj = obj || new exports();

      if (data.hasOwnProperty('lat')) {
        obj['lat'] = ApiClient.convertToType(data['lat'], 'Number');
      }
      if (data.hasOwnProperty('lng')) {
        obj['lng'] = ApiClient.convertToType(data['lng'], 'Number');
      }
      if (data.hasOwnProperty('ride_types')) {
        obj['ride_types'] = ApiClient.convertToType(data['ride_types'], [RideTypeEnum]);
      }
    }
    return obj;
  }


  /**
   * The latitude component of a location
   * @member {Number} lat
   */
  exports.prototype['lat'] = undefined;

  /**
   * The longitude component of a location
   * @member {Number} lng
   */
  exports.prototype['lng'] = undefined;

  /**
   * @member {Array.<module:model/RideTypeEnum>} ride_types
   */
  exports.prototype['ride_types'] = undefined;




  return exports;
}));

},{"../ApiClient":7,"./RideTypeEnum":44}],49:[function(require,module,exports){
(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['../ApiClient', './RideStatusEnum'], factory);
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS-like environments that support module.exports, like Node.
    module.exports = factory(require('../ApiClient'), require('./RideStatusEnum'));
  } else {
    // Browser globals (root is window)
    if (!root.LyftApi) {
      root.LyftApi = {};
    }
    root.LyftApi.SandboxRideUpdate = factory(root.LyftApi.ApiClient, root.LyftApi.RideStatusEnum);
  }
}(this, function(ApiClient, RideStatusEnum) {
  'use strict';

  /**
   * The SandboxRideUpdate model module.
   * @module model/SandboxRideUpdate
   * @version 1.0.0
   */

  /**
   * Constructs a new <code>SandboxRideUpdate</code>.
   * Response when a sandbox ride is propagated between states
   * @alias module:model/SandboxRideUpdate
   * @class
   */
  var exports = function() {



  };

  /**
   * Constructs a <code>SandboxRideUpdate</code> from a plain JavaScript object, optionally creating a new instance.
   * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
   * @param {Object} data The plain JavaScript object bearing properties of interest.
   * @param {module:model/SandboxRideUpdate} obj Optional instance to populate.
   * @return {module:model/SandboxRideUpdate} The populated <code>SandboxRideUpdate</code> instance.
   */
  exports.constructFromObject = function(data, obj) {
    if (data) { 
      obj = obj || new exports();

      if (data.hasOwnProperty('ride_id')) {
        obj['ride_id'] = ApiClient.convertToType(data['ride_id'], 'String');
      }
      if (data.hasOwnProperty('status')) {
        obj['status'] = RideStatusEnum.constructFromObject(data['status']);
      }
    }
    return obj;
  }


  /**
   * The ID of the ride
   * @member {String} ride_id
   */
  exports.prototype['ride_id'] = undefined;

  /**
   * @member {module:model/RideStatusEnum} status
   */
  exports.prototype['status'] = undefined;




  return exports;
}));

},{"../ApiClient":7,"./RideStatusEnum":42}],50:[function(require,module,exports){
(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['../ApiClient'], factory);
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS-like environments that support module.exports, like Node.
    module.exports = factory(require('../ApiClient'));
  } else {
    // Browser globals (root is window)
    if (!root.LyftApi) {
      root.LyftApi = {};
    }
    root.LyftApi.Tip = factory(root.LyftApi.ApiClient);
  }
}(this, function(ApiClient) {
  'use strict';

  /**
   * The Tip model module.
   * @module model/Tip
   * @version 1.0.0
   */

  /**
   * Constructs a new <code>Tip</code>.
   * @alias module:model/Tip
   * @class
   */
  var exports = function() {



  };

  /**
   * Constructs a <code>Tip</code> from a plain JavaScript object, optionally creating a new instance.
   * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
   * @param {Object} data The plain JavaScript object bearing properties of interest.
   * @param {module:model/Tip} obj Optional instance to populate.
   * @return {module:model/Tip} The populated <code>Tip</code> instance.
   */
  exports.constructFromObject = function(data, obj) {
    if (data) { 
      obj = obj || new exports();

      if (data.hasOwnProperty('amount')) {
        obj['amount'] = ApiClient.convertToType(data['amount'], 'Integer');
      }
      if (data.hasOwnProperty('currency')) {
        obj['currency'] = ApiClient.convertToType(data['currency'], 'String');
      }
    }
    return obj;
  }


  /**
   * A tip for the driver in cents. To be charged to the user's default charge account.
   * @member {Integer} amount
   */
  exports.prototype['amount'] = undefined;

  /**
   * The currency in which you want to tip. e.g. USD
   * @member {String} currency
   */
  exports.prototype['currency'] = undefined;




  return exports;
}));

},{"../ApiClient":7}],51:[function(require,module,exports){
(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['../ApiClient', './Tip'], factory);
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS-like environments that support module.exports, like Node.
    module.exports = factory(require('../ApiClient'), require('./Tip'));
  } else {
    // Browser globals (root is window)
    if (!root.LyftApi) {
      root.LyftApi = {};
    }
    root.LyftApi.TipParams = factory(root.LyftApi.ApiClient, root.LyftApi.Tip);
  }
}(this, function(ApiClient, Tip) {
  'use strict';

  /**
   * The TipParams model module.
   * @module model/TipParams
   * @version 1.0.0
   */

  /**
   * Constructs a new <code>TipParams</code>.
   * @alias module:model/TipParams
   * @class
   * @extends module:model/Tip
   */
  var exports = function() {
    Tip.call(this);
  };

  /**
   * Constructs a <code>TipParams</code> from a plain JavaScript object, optionally creating a new instance.
   * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
   * @param {Object} data The plain JavaScript object bearing properties of interest.
   * @param {module:model/TipParams} obj Optional instance to populate.
   * @return {module:model/TipParams} The populated <code>TipParams</code> instance.
   */
  exports.constructFromObject = function(data, obj) {
    if (data) { 
      obj = obj || new exports();
      Tip.constructFromObject(data, obj);
    }
    return obj;
  }

  exports.prototype = Object.create(Tip.prototype);
  exports.prototype.constructor = exports;





  return exports;
}));

},{"../ApiClient":7,"./Tip":50}],52:[function(require,module,exports){
(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['../ApiClient'], factory);
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS-like environments that support module.exports, like Node.
    module.exports = factory(require('../ApiClient'));
  } else {
    // Browser globals (root is window)
    if (!root.LyftApi) {
      root.LyftApi = {};
    }
    root.LyftApi.UserDetail = factory(root.LyftApi.ApiClient);
  }
}(this, function(ApiClient) {
  'use strict';

  /**
   * The UserDetail model module.
   * @module model/UserDetail
   * @version 1.0.0
   */

  /**
   * Constructs a new <code>UserDetail</code>.
   * @alias module:model/UserDetail
   * @class
   * @param firstName
   * @param lastName
   */
  var exports = function(firstName, lastName) {

    this['first_name'] = firstName;
    this['last_name'] = lastName;
  };

  /**
   * Constructs a <code>UserDetail</code> from a plain JavaScript object, optionally creating a new instance.
   * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
   * @param {Object} data The plain JavaScript object bearing properties of interest.
   * @param {module:model/UserDetail} obj Optional instance to populate.
   * @return {module:model/UserDetail} The populated <code>UserDetail</code> instance.
   */
  exports.constructFromObject = function(data, obj) {
    if (data) { 
      obj = obj || new exports();

      if (data.hasOwnProperty('first_name')) {
        obj['first_name'] = ApiClient.convertToType(data['first_name'], 'String');
      }
      if (data.hasOwnProperty('last_name')) {
        obj['last_name'] = ApiClient.convertToType(data['last_name'], 'String');
      }
    }
    return obj;
  }


  /**
   * The passenger's first name
   * @member {String} first_name
   */
  exports.prototype['first_name'] = undefined;

  /**
   * The passenger's last name
   * @member {String} last_name
   */
  exports.prototype['last_name'] = undefined;




  return exports;
}));

},{"../ApiClient":7}],53:[function(require,module,exports){
(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['../ApiClient'], factory);
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS-like environments that support module.exports, like Node.
    module.exports = factory(require('../ApiClient'));
  } else {
    // Browser globals (root is window)
    if (!root.LyftApi) {
      root.LyftApi = {};
    }
    root.LyftApi.VehicleDetail = factory(root.LyftApi.ApiClient);
  }
}(this, function(ApiClient) {
  'use strict';

  /**
   * The VehicleDetail model module.
   * @module model/VehicleDetail
   * @version 1.0.0
   */

  /**
   * Constructs a new <code>VehicleDetail</code>.
   * @alias module:model/VehicleDetail
   * @class
   * @param make
   * @param model
   * @param year
   * @param licensePlate
   * @param licensePlateState
   * @param color
   * @param imageUrl
   */
  var exports = function(make, model, year, licensePlate, licensePlateState, color, imageUrl) {

    this['make'] = make;
    this['model'] = model;
    this['year'] = year;
    this['license_plate'] = licensePlate;
    this['license_plate_state'] = licensePlateState;
    this['color'] = color;
    this['image_url'] = imageUrl;
  };

  /**
   * Constructs a <code>VehicleDetail</code> from a plain JavaScript object, optionally creating a new instance.
   * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
   * @param {Object} data The plain JavaScript object bearing properties of interest.
   * @param {module:model/VehicleDetail} obj Optional instance to populate.
   * @return {module:model/VehicleDetail} The populated <code>VehicleDetail</code> instance.
   */
  exports.constructFromObject = function(data, obj) {
    if (data) { 
      obj = obj || new exports();

      if (data.hasOwnProperty('make')) {
        obj['make'] = ApiClient.convertToType(data['make'], 'String');
      }
      if (data.hasOwnProperty('model')) {
        obj['model'] = ApiClient.convertToType(data['model'], 'String');
      }
      if (data.hasOwnProperty('year')) {
        obj['year'] = ApiClient.convertToType(data['year'], 'Integer');
      }
      if (data.hasOwnProperty('license_plate')) {
        obj['license_plate'] = ApiClient.convertToType(data['license_plate'], 'String');
      }
      if (data.hasOwnProperty('license_plate_state')) {
        obj['license_plate_state'] = ApiClient.convertToType(data['license_plate_state'], 'String');
      }
      if (data.hasOwnProperty('color')) {
        obj['color'] = ApiClient.convertToType(data['color'], 'String');
      }
      if (data.hasOwnProperty('image_url')) {
        obj['image_url'] = ApiClient.convertToType(data['image_url'], 'String');
      }
    }
    return obj;
  }


  /**
   * The vehicle's maker
   * @member {String} make
   */
  exports.prototype['make'] = undefined;

  /**
   * The vehicle's model
   * @member {String} model
   */
  exports.prototype['model'] = undefined;

  /**
   * The vehicle's model year
   * @member {Integer} year
   */
  exports.prototype['year'] = undefined;

  /**
   * The vehicle's license plate
   * @member {String} license_plate
   */
  exports.prototype['license_plate'] = undefined;

  /**
   * The vehicle's license plate state
   * @member {String} license_plate_state
   */
  exports.prototype['license_plate_state'] = undefined;

  /**
   * The vehicle's color
   * @member {String} color
   */
  exports.prototype['color'] = undefined;

  /**
   * The vehicle's image url
   * @member {String} image_url
   */
  exports.prototype['image_url'] = undefined;




  return exports;
}));

},{"../ApiClient":7}],54:[function(require,module,exports){

/**
 * Reduce `arr` with `fn`.
 *
 * @param {Array} arr
 * @param {Function} fn
 * @param {Mixed} initial
 *
 * TODO: combatible error handling?
 */

module.exports = function(arr, fn, initial){  
  var idx = 0;
  var len = arr.length;
  var curr = arguments.length == 3
    ? initial
    : arr[idx++];

  while (idx < len) {
    curr = fn.call(null, curr, arr[idx], ++idx, arr);
  }
  
  return curr;
};
},{}],55:[function(require,module,exports){
/**
 * Module dependencies.
 */

var Emitter = require('emitter');
var reduce = require('reduce');

/**
 * Root reference for iframes.
 */

var root;
if (typeof window !== 'undefined') { // Browser window
  root = window;
} else if (typeof self !== 'undefined') { // Web Worker
  root = self;
} else { // Other environments
  root = this;
}

/**
 * Noop.
 */

function noop(){};

/**
 * Check if `obj` is a host object,
 * we don't want to serialize these :)
 *
 * TODO: future proof, move to compoent land
 *
 * @param {Object} obj
 * @return {Boolean}
 * @api private
 */

function isHost(obj) {
  var str = {}.toString.call(obj);

  switch (str) {
    case '[object File]':
    case '[object Blob]':
    case '[object FormData]':
      return true;
    default:
      return false;
  }
}

/**
 * Determine XHR.
 */

request.getXHR = function () {
  if (root.XMLHttpRequest
      && (!root.location || 'file:' != root.location.protocol
          || !root.ActiveXObject)) {
    return new XMLHttpRequest;
  } else {
    try { return new ActiveXObject('Microsoft.XMLHTTP'); } catch(e) {}
    try { return new ActiveXObject('Msxml2.XMLHTTP.6.0'); } catch(e) {}
    try { return new ActiveXObject('Msxml2.XMLHTTP.3.0'); } catch(e) {}
    try { return new ActiveXObject('Msxml2.XMLHTTP'); } catch(e) {}
  }
  return false;
};

/**
 * Removes leading and trailing whitespace, added to support IE.
 *
 * @param {String} s
 * @return {String}
 * @api private
 */

var trim = ''.trim
  ? function(s) { return s.trim(); }
  : function(s) { return s.replace(/(^\s*|\s*$)/g, ''); };

/**
 * Check if `obj` is an object.
 *
 * @param {Object} obj
 * @return {Boolean}
 * @api private
 */

function isObject(obj) {
  return obj === Object(obj);
}

/**
 * Serialize the given `obj`.
 *
 * @param {Object} obj
 * @return {String}
 * @api private
 */

function serialize(obj) {
  if (!isObject(obj)) return obj;
  var pairs = [];
  for (var key in obj) {
    if (null != obj[key]) {
      pushEncodedKeyValuePair(pairs, key, obj[key]);
        }
      }
  return pairs.join('&');
}

/**
 * Helps 'serialize' with serializing arrays.
 * Mutates the pairs array.
 *
 * @param {Array} pairs
 * @param {String} key
 * @param {Mixed} val
 */

function pushEncodedKeyValuePair(pairs, key, val) {
  if (Array.isArray(val)) {
    return val.forEach(function(v) {
      pushEncodedKeyValuePair(pairs, key, v);
    });
  }
  pairs.push(encodeURIComponent(key)
    + '=' + encodeURIComponent(val));
}

/**
 * Expose serialization method.
 */

 request.serializeObject = serialize;

 /**
  * Parse the given x-www-form-urlencoded `str`.
  *
  * @param {String} str
  * @return {Object}
  * @api private
  */

function parseString(str) {
  var obj = {};
  var pairs = str.split('&');
  var parts;
  var pair;

  for (var i = 0, len = pairs.length; i < len; ++i) {
    pair = pairs[i];
    parts = pair.split('=');
    obj[decodeURIComponent(parts[0])] = decodeURIComponent(parts[1]);
  }

  return obj;
}

/**
 * Expose parser.
 */

request.parseString = parseString;

/**
 * Default MIME type map.
 *
 *     superagent.types.xml = 'application/xml';
 *
 */

request.types = {
  html: 'text/html',
  json: 'application/json',
  xml: 'application/xml',
  urlencoded: 'application/x-www-form-urlencoded',
  'form': 'application/x-www-form-urlencoded',
  'form-data': 'application/x-www-form-urlencoded'
};

/**
 * Default serialization map.
 *
 *     superagent.serialize['application/xml'] = function(obj){
 *       return 'generated xml here';
 *     };
 *
 */

 request.serialize = {
   'application/x-www-form-urlencoded': serialize,
   'application/json': JSON.stringify
 };

 /**
  * Default parsers.
  *
  *     superagent.parse['application/xml'] = function(str){
  *       return { object parsed from str };
  *     };
  *
  */

request.parse = {
  'application/x-www-form-urlencoded': parseString,
  'application/json': JSON.parse
};

/**
 * Parse the given header `str` into
 * an object containing the mapped fields.
 *
 * @param {String} str
 * @return {Object}
 * @api private
 */

function parseHeader(str) {
  var lines = str.split(/\r?\n/);
  var fields = {};
  var index;
  var line;
  var field;
  var val;

  lines.pop(); // trailing CRLF

  for (var i = 0, len = lines.length; i < len; ++i) {
    line = lines[i];
    index = line.indexOf(':');
    field = line.slice(0, index).toLowerCase();
    val = trim(line.slice(index + 1));
    fields[field] = val;
  }

  return fields;
}

/**
 * Check if `mime` is json or has +json structured syntax suffix.
 *
 * @param {String} mime
 * @return {Boolean}
 * @api private
 */

function isJSON(mime) {
  return /[\/+]json\b/.test(mime);
}

/**
 * Return the mime type for the given `str`.
 *
 * @param {String} str
 * @return {String}
 * @api private
 */

function type(str){
  return str.split(/ *; */).shift();
};

/**
 * Return header field parameters.
 *
 * @param {String} str
 * @return {Object}
 * @api private
 */

function params(str){
  return reduce(str.split(/ *; */), function(obj, str){
    var parts = str.split(/ *= */)
      , key = parts.shift()
      , val = parts.shift();

    if (key && val) obj[key] = val;
    return obj;
  }, {});
};

/**
 * Initialize a new `Response` with the given `xhr`.
 *
 *  - set flags (.ok, .error, etc)
 *  - parse header
 *
 * Examples:
 *
 *  Aliasing `superagent` as `request` is nice:
 *
 *      request = superagent;
 *
 *  We can use the promise-like API, or pass callbacks:
 *
 *      request.get('/').end(function(res){});
 *      request.get('/', function(res){});
 *
 *  Sending data can be chained:
 *
 *      request
 *        .post('/user')
 *        .send({ name: 'tj' })
 *        .end(function(res){});
 *
 *  Or passed to `.send()`:
 *
 *      request
 *        .post('/user')
 *        .send({ name: 'tj' }, function(res){});
 *
 *  Or passed to `.post()`:
 *
 *      request
 *        .post('/user', { name: 'tj' })
 *        .end(function(res){});
 *
 * Or further reduced to a single call for simple cases:
 *
 *      request
 *        .post('/user', { name: 'tj' }, function(res){});
 *
 * @param {XMLHTTPRequest} xhr
 * @param {Object} options
 * @api private
 */

function Response(req, options) {
  options = options || {};
  this.req = req;
  this.xhr = this.req.xhr;
  // responseText is accessible only if responseType is '' or 'text' and on older browsers
  this.text = ((this.req.method !='HEAD' && (this.xhr.responseType === '' || this.xhr.responseType === 'text')) || typeof this.xhr.responseType === 'undefined')
     ? this.xhr.responseText
     : null;
  this.statusText = this.req.xhr.statusText;
  this.setStatusProperties(this.xhr.status);
  this.header = this.headers = parseHeader(this.xhr.getAllResponseHeaders());
  // getAllResponseHeaders sometimes falsely returns "" for CORS requests, but
  // getResponseHeader still works. so we get content-type even if getting
  // other headers fails.
  this.header['content-type'] = this.xhr.getResponseHeader('content-type');
  this.setHeaderProperties(this.header);
  this.body = this.req.method != 'HEAD'
    ? this.parseBody(this.text ? this.text : this.xhr.response)
    : null;
}

/**
 * Get case-insensitive `field` value.
 *
 * @param {String} field
 * @return {String}
 * @api public
 */

Response.prototype.get = function(field){
  return this.header[field.toLowerCase()];
};

/**
 * Set header related properties:
 *
 *   - `.type` the content type without params
 *
 * A response of "Content-Type: text/plain; charset=utf-8"
 * will provide you with a `.type` of "text/plain".
 *
 * @param {Object} header
 * @api private
 */

Response.prototype.setHeaderProperties = function(header){
  // content-type
  var ct = this.header['content-type'] || '';
  this.type = type(ct);

  // params
  var obj = params(ct);
  for (var key in obj) this[key] = obj[key];
};

/**
 * Parse the given body `str`.
 *
 * Used for auto-parsing of bodies. Parsers
 * are defined on the `superagent.parse` object.
 *
 * @param {String} str
 * @return {Mixed}
 * @api private
 */

Response.prototype.parseBody = function(str){
  var parse = request.parse[this.type];
  return parse && str && (str.length || str instanceof Object)
    ? parse(str)
    : null;
};

/**
 * Set flags such as `.ok` based on `status`.
 *
 * For example a 2xx response will give you a `.ok` of __true__
 * whereas 5xx will be __false__ and `.error` will be __true__. The
 * `.clientError` and `.serverError` are also available to be more
 * specific, and `.statusType` is the class of error ranging from 1..5
 * sometimes useful for mapping respond colors etc.
 *
 * "sugar" properties are also defined for common cases. Currently providing:
 *
 *   - .noContent
 *   - .badRequest
 *   - .unauthorized
 *   - .notAcceptable
 *   - .notFound
 *
 * @param {Number} status
 * @api private
 */

Response.prototype.setStatusProperties = function(status){
  // handle IE9 bug: http://stackoverflow.com/questions/10046972/msie-returns-status-code-of-1223-for-ajax-request
  if (status === 1223) {
    status = 204;
  }

  var type = status / 100 | 0;

  // status / class
  this.status = this.statusCode = status;
  this.statusType = type;

  // basics
  this.info = 1 == type;
  this.ok = 2 == type;
  this.clientError = 4 == type;
  this.serverError = 5 == type;
  this.error = (4 == type || 5 == type)
    ? this.toError()
    : false;

  // sugar
  this.accepted = 202 == status;
  this.noContent = 204 == status;
  this.badRequest = 400 == status;
  this.unauthorized = 401 == status;
  this.notAcceptable = 406 == status;
  this.notFound = 404 == status;
  this.forbidden = 403 == status;
};

/**
 * Return an `Error` representative of this response.
 *
 * @return {Error}
 * @api public
 */

Response.prototype.toError = function(){
  var req = this.req;
  var method = req.method;
  var url = req.url;

  var msg = 'cannot ' + method + ' ' + url + ' (' + this.status + ')';
  var err = new Error(msg);
  err.status = this.status;
  err.method = method;
  err.url = url;

  return err;
};

/**
 * Expose `Response`.
 */

request.Response = Response;

/**
 * Initialize a new `Request` with the given `method` and `url`.
 *
 * @param {String} method
 * @param {String} url
 * @api public
 */

function Request(method, url) {
  var self = this;
  Emitter.call(this);
  this._query = this._query || [];
  this.method = method;
  this.url = url;
  this.header = {};
  this._header = {};
  this.on('end', function(){
    var err = null;
    var res = null;

    try {
      res = new Response(self);
    } catch(e) {
      err = new Error('Parser is unable to parse the response');
      err.parse = true;
      err.original = e;
      // issue #675: return the raw response if the response parsing fails
      err.rawResponse = self.xhr && self.xhr.responseText ? self.xhr.responseText : null;
      return self.callback(err);
    }

    self.emit('response', res);

    if (err) {
      return self.callback(err, res);
    }

    if (res.status >= 200 && res.status < 300) {
      return self.callback(err, res);
    }

    var new_err = new Error(res.statusText || 'Unsuccessful HTTP response');
    new_err.original = err;
    new_err.response = res;
    new_err.status = res.status;

    self.callback(new_err, res);
  });
}

/**
 * Mixin `Emitter`.
 */

Emitter(Request.prototype);

/**
 * Allow for extension
 */

Request.prototype.use = function(fn) {
  fn(this);
  return this;
}

/**
 * Set timeout to `ms`.
 *
 * @param {Number} ms
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.timeout = function(ms){
  this._timeout = ms;
  return this;
};

/**
 * Clear previous timeout.
 *
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.clearTimeout = function(){
  this._timeout = 0;
  clearTimeout(this._timer);
  return this;
};

/**
 * Abort the request, and clear potential timeout.
 *
 * @return {Request}
 * @api public
 */

Request.prototype.abort = function(){
  if (this.aborted) return;
  this.aborted = true;
  this.xhr.abort();
  this.clearTimeout();
  this.emit('abort');
  return this;
};

/**
 * Set header `field` to `val`, or multiple fields with one object.
 *
 * Examples:
 *
 *      req.get('/')
 *        .set('Accept', 'application/json')
 *        .set('X-API-Key', 'foobar')
 *        .end(callback);
 *
 *      req.get('/')
 *        .set({ Accept: 'application/json', 'X-API-Key': 'foobar' })
 *        .end(callback);
 *
 * @param {String|Object} field
 * @param {String} val
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.set = function(field, val){
  if (isObject(field)) {
    for (var key in field) {
      this.set(key, field[key]);
    }
    return this;
  }
  this._header[field.toLowerCase()] = val;
  this.header[field] = val;
  return this;
};

/**
 * Remove header `field`.
 *
 * Example:
 *
 *      req.get('/')
 *        .unset('User-Agent')
 *        .end(callback);
 *
 * @param {String} field
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.unset = function(field){
  delete this._header[field.toLowerCase()];
  delete this.header[field];
  return this;
};

/**
 * Get case-insensitive header `field` value.
 *
 * @param {String} field
 * @return {String}
 * @api private
 */

Request.prototype.getHeader = function(field){
  return this._header[field.toLowerCase()];
};

/**
 * Set Content-Type to `type`, mapping values from `request.types`.
 *
 * Examples:
 *
 *      superagent.types.xml = 'application/xml';
 *
 *      request.post('/')
 *        .type('xml')
 *        .send(xmlstring)
 *        .end(callback);
 *
 *      request.post('/')
 *        .type('application/xml')
 *        .send(xmlstring)
 *        .end(callback);
 *
 * @param {String} type
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.type = function(type){
  this.set('Content-Type', request.types[type] || type);
  return this;
};

/**
 * Force given parser
 *
 * Sets the body parser no matter type.
 *
 * @param {Function}
 * @api public
 */

Request.prototype.parse = function(fn){
  this._parser = fn;
  return this;
};

/**
 * Set Accept to `type`, mapping values from `request.types`.
 *
 * Examples:
 *
 *      superagent.types.json = 'application/json';
 *
 *      request.get('/agent')
 *        .accept('json')
 *        .end(callback);
 *
 *      request.get('/agent')
 *        .accept('application/json')
 *        .end(callback);
 *
 * @param {String} accept
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.accept = function(type){
  this.set('Accept', request.types[type] || type);
  return this;
};

/**
 * Set Authorization field value with `user` and `pass`.
 *
 * @param {String} user
 * @param {String} pass
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.auth = function(user, pass){
  var str = btoa(user + ':' + pass);
  this.set('Authorization', 'Basic ' + str);
  return this;
};

/**
* Add query-string `val`.
*
* Examples:
*
*   request.get('/shoes')
*     .query('size=10')
*     .query({ color: 'blue' })
*
* @param {Object|String} val
* @return {Request} for chaining
* @api public
*/

Request.prototype.query = function(val){
  if ('string' != typeof val) val = serialize(val);
  if (val) this._query.push(val);
  return this;
};

/**
 * Write the field `name` and `val` for "multipart/form-data"
 * request bodies.
 *
 * ``` js
 * request.post('/upload')
 *   .field('foo', 'bar')
 *   .end(callback);
 * ```
 *
 * @param {String} name
 * @param {String|Blob|File} val
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.field = function(name, val){
  if (!this._formData) this._formData = new root.FormData();
  this._formData.append(name, val);
  return this;
};

/**
 * Queue the given `file` as an attachment to the specified `field`,
 * with optional `filename`.
 *
 * ``` js
 * request.post('/upload')
 *   .attach(new Blob(['<a id="a"><b id="b">hey!</b></a>'], { type: "text/html"}))
 *   .end(callback);
 * ```
 *
 * @param {String} field
 * @param {Blob|File} file
 * @param {String} filename
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.attach = function(field, file, filename){
  if (!this._formData) this._formData = new root.FormData();
  this._formData.append(field, file, filename || file.name);
  return this;
};

/**
 * Send `data` as the request body, defaulting the `.type()` to "json" when
 * an object is given.
 *
 * Examples:
 *
 *       // manual json
 *       request.post('/user')
 *         .type('json')
 *         .send('{"name":"tj"}')
 *         .end(callback)
 *
 *       // auto json
 *       request.post('/user')
 *         .send({ name: 'tj' })
 *         .end(callback)
 *
 *       // manual x-www-form-urlencoded
 *       request.post('/user')
 *         .type('form')
 *         .send('name=tj')
 *         .end(callback)
 *
 *       // auto x-www-form-urlencoded
 *       request.post('/user')
 *         .type('form')
 *         .send({ name: 'tj' })
 *         .end(callback)
 *
 *       // defaults to x-www-form-urlencoded
  *      request.post('/user')
  *        .send('name=tobi')
  *        .send('species=ferret')
  *        .end(callback)
 *
 * @param {String|Object} data
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.send = function(data){
  var obj = isObject(data);
  var type = this.getHeader('Content-Type');

  // merge
  if (obj && isObject(this._data)) {
    for (var key in data) {
      this._data[key] = data[key];
    }
  } else if ('string' == typeof data) {
    if (!type) this.type('form');
    type = this.getHeader('Content-Type');
    if ('application/x-www-form-urlencoded' == type) {
      this._data = this._data
        ? this._data + '&' + data
        : data;
    } else {
      this._data = (this._data || '') + data;
    }
  } else {
    this._data = data;
  }

  if (!obj || isHost(data)) return this;
  if (!type) this.type('json');
  return this;
};

/**
 * Invoke the callback with `err` and `res`
 * and handle arity check.
 *
 * @param {Error} err
 * @param {Response} res
 * @api private
 */

Request.prototype.callback = function(err, res){
  var fn = this._callback;
  this.clearTimeout();
  fn(err, res);
};

/**
 * Invoke callback with x-domain error.
 *
 * @api private
 */

Request.prototype.crossDomainError = function(){
  var err = new Error('Request has been terminated\nPossible causes: the network is offline, Origin is not allowed by Access-Control-Allow-Origin, the page is being unloaded, etc.');
  err.crossDomain = true;

  err.status = this.status;
  err.method = this.method;
  err.url = this.url;

  this.callback(err);
};

/**
 * Invoke callback with timeout error.
 *
 * @api private
 */

Request.prototype.timeoutError = function(){
  var timeout = this._timeout;
  var err = new Error('timeout of ' + timeout + 'ms exceeded');
  err.timeout = timeout;
  this.callback(err);
};

/**
 * Enable transmission of cookies with x-domain requests.
 *
 * Note that for this to work the origin must not be
 * using "Access-Control-Allow-Origin" with a wildcard,
 * and also must set "Access-Control-Allow-Credentials"
 * to "true".
 *
 * @api public
 */

Request.prototype.withCredentials = function(){
  this._withCredentials = true;
  return this;
};

/**
 * Initiate request, invoking callback `fn(res)`
 * with an instanceof `Response`.
 *
 * @param {Function} fn
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.end = function(fn){
  var self = this;
  var xhr = this.xhr = request.getXHR();
  var query = this._query.join('&');
  var timeout = this._timeout;
  var data = this._formData || this._data;

  // store callback
  this._callback = fn || noop;

  // state change
  xhr.onreadystatechange = function(){
    if (4 != xhr.readyState) return;

    // In IE9, reads to any property (e.g. status) off of an aborted XHR will
    // result in the error "Could not complete the operation due to error c00c023f"
    var status;
    try { status = xhr.status } catch(e) { status = 0; }

    if (0 == status) {
      if (self.timedout) return self.timeoutError();
      if (self.aborted) return;
      return self.crossDomainError();
    }
    self.emit('end');
  };

  // progress
  var handleProgress = function(e){
    if (e.total > 0) {
      e.percent = e.loaded / e.total * 100;
    }
    e.direction = 'download';
    self.emit('progress', e);
  };
  if (this.hasListeners('progress')) {
    xhr.onprogress = handleProgress;
  }
  try {
    if (xhr.upload && this.hasListeners('progress')) {
      xhr.upload.onprogress = handleProgress;
    }
  } catch(e) {
    // Accessing xhr.upload fails in IE from a web worker, so just pretend it doesn't exist.
    // Reported here:
    // https://connect.microsoft.com/IE/feedback/details/837245/xmlhttprequest-upload-throws-invalid-argument-when-used-from-web-worker-context
  }

  // timeout
  if (timeout && !this._timer) {
    this._timer = setTimeout(function(){
      self.timedout = true;
      self.abort();
    }, timeout);
  }

  // querystring
  if (query) {
    query = request.serializeObject(query);
    this.url += ~this.url.indexOf('?')
      ? '&' + query
      : '?' + query;
  }

  // initiate request
  xhr.open(this.method, this.url, true);

  // CORS
  if (this._withCredentials) xhr.withCredentials = true;

  // body
  if ('GET' != this.method && 'HEAD' != this.method && 'string' != typeof data && !isHost(data)) {
    // serialize stuff
    var contentType = this.getHeader('Content-Type');
    var serialize = this._parser || request.serialize[contentType ? contentType.split(';')[0] : ''];
    if (!serialize && isJSON(contentType)) serialize = request.serialize['application/json'];
    if (serialize) data = serialize(data);
  }

  // set header fields
  for (var field in this.header) {
    if (null == this.header[field]) continue;
    xhr.setRequestHeader(field, this.header[field]);
  }

  // send stuff
  this.emit('request', this);

  // IE11 xhr.send(undefined) sends 'undefined' string as POST payload (instead of nothing)
  // We need null here if data is undefined
  xhr.send(typeof data !== 'undefined' ? data : null);
  return this;
};

/**
 * Faux promise support
 *
 * @param {Function} fulfill
 * @param {Function} reject
 * @return {Request}
 */

Request.prototype.then = function (fulfill, reject) {
  return this.end(function(err, res) {
    err ? reject(err) : fulfill(res);
  });
}

/**
 * Expose `Request`.
 */

request.Request = Request;

/**
 * Issue a request:
 *
 * Examples:
 *
 *    request('GET', '/users').end(callback)
 *    request('/users').end(callback)
 *    request('/users', callback)
 *
 * @param {String} method
 * @param {String|Function} url or callback
 * @return {Request}
 * @api public
 */

function request(method, url) {
  // callback
  if ('function' == typeof url) {
    return new Request('GET', method).end(url);
  }

  // url first
  if (1 == arguments.length) {
    return new Request('GET', method);
  }

  return new Request(method, url);
}

/**
 * GET `url` with optional callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed|Function} data or fn
 * @param {Function} fn
 * @return {Request}
 * @api public
 */

request.get = function(url, data, fn){
  var req = request('GET', url);
  if ('function' == typeof data) fn = data, data = null;
  if (data) req.query(data);
  if (fn) req.end(fn);
  return req;
};

/**
 * HEAD `url` with optional callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed|Function} data or fn
 * @param {Function} fn
 * @return {Request}
 * @api public
 */

request.head = function(url, data, fn){
  var req = request('HEAD', url);
  if ('function' == typeof data) fn = data, data = null;
  if (data) req.send(data);
  if (fn) req.end(fn);
  return req;
};

/**
 * DELETE `url` with optional callback `fn(res)`.
 *
 * @param {String} url
 * @param {Function} fn
 * @return {Request}
 * @api public
 */

function del(url, fn){
  var req = request('DELETE', url);
  if (fn) req.end(fn);
  return req;
};

request['del'] = del;
request['delete'] = del;

/**
 * PATCH `url` with optional `data` and callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed} data
 * @param {Function} fn
 * @return {Request}
 * @api public
 */

request.patch = function(url, data, fn){
  var req = request('PATCH', url);
  if ('function' == typeof data) fn = data, data = null;
  if (data) req.send(data);
  if (fn) req.end(fn);
  return req;
};

/**
 * POST `url` with optional `data` and callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed} data
 * @param {Function} fn
 * @return {Request}
 * @api public
 */

request.post = function(url, data, fn){
  var req = request('POST', url);
  if ('function' == typeof data) fn = data, data = null;
  if (data) req.send(data);
  if (fn) req.end(fn);
  return req;
};

/**
 * PUT `url` with optional `data` and callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed|Function} data or fn
 * @param {Function} fn
 * @return {Request}
 * @api public
 */

request.put = function(url, data, fn){
  var req = request('PUT', url);
  if ('function' == typeof data) fn = data, data = null;
  if (data) req.send(data);
  if (fn) req.end(fn);
  return req;
};

/**
 * Expose `request`.
 */

module.exports = request;

},{"emitter":6,"reduce":54}],56:[function(require,module,exports){
var LyftApi = require('lyft-api');

var defaultClient = LyftApi.ApiClient.default;

var ClientAuthentication = defaultClient.authentications['gAAAAABXvLCVr6uY651QmKu_Pj2_trgqXSPe9AVJ9lldCe3vPjzUDBHXG19FXDZoWZ7_G3U_u01K4fuw3Lj7W6ml30v7jiuH4rlEfaxdqS9UiLhn2eiTkhezLF8Y66I3cpuF4b7UhXlS25Y5xbmPb6Qz5m9dllLJQBH11bxMe4o-Qh5mtAaEUVw='];
ClientAuthentication.accessToken = "04gYKvHBfWi_HS7uuiERZqBiH9V_YWBd";

var api = new LyftApi.PublicApi()

var startLat = latOr; // {Number} Latitude of the starting location

var startLng = longOr; // {Number} Longitude of the starting location

var opts = { 
  'rideType': "rideType_example", // {String} ID of a ride type
  'endLat': latDes, // {Number} Latitude of the ending location
  'endLng': longDes // {Number} Longitude of the ending location
};

var callback = function(error, data, response) {
  if (error) {
    console.error(error);
  } else {
    console.log('API called successfully. Returned data: ' + data);
  }
};
api.costGet(startLat, startLng, opts, callback);

},{"lyft-api":11}]},{},[56]);
