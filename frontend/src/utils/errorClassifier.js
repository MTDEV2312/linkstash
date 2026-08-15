export const ERROR_TYPES = {
  NETWORK: 'NETWORK',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION: 'VALIDATION',
  CONFLICT: 'CONFLICT',
  SERVER: 'SERVER',
  ABORT: 'ABORT',
  UNKNOWN: 'UNKNOWN'
};

export const classifyError = (error) => {
  if (error?.name === 'AbortError') {
    return { type: ERROR_TYPES.ABORT, message: 'Solicitud cancelada', statusCode: null };
  }

  if (!error?.response) {
    return { type: ERROR_TYPES.NETWORK, message: 'Error de conexión. Verifica tu internet', statusCode: null };
  }

  const status = error.response.status;
  const data = error.response.data;
  const message = data?.message || error.message || 'Ocurrió un error inesperado';

  const typeMap = {
    400: ERROR_TYPES.VALIDATION,
    401: ERROR_TYPES.UNAUTHORIZED,
    403: ERROR_TYPES.FORBIDDEN,
    404: ERROR_TYPES.NOT_FOUND,
    409: ERROR_TYPES.CONFLICT,
    422: ERROR_TYPES.VALIDATION
  };

  const type = status >= 500 ? ERROR_TYPES.SERVER : (typeMap[status] || ERROR_TYPES.UNKNOWN);

  return {
    type,
    message,
    statusCode: status,
    validationErrors: data?.errors || null
  };
};
