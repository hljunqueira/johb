import { getErrorMessage } from '../api';

describe('API Utils', () => {
  describe('getErrorMessage', () => {
    it('should return network error message for connection errors', () => {
      const error = {
        code: 'ECONNABORTED',
        message: 'timeout'
      };
      
      expect(getErrorMessage(error)).toBe('A requisição demorou muito. Tente novamente.');
    });

    it('should return network error message when no response', () => {
      const error = {
        message: 'Network Error'
      };
      
      expect(getErrorMessage(error)).toBe('Erro de conexão. Verifique sua internet.');
    });

    it('should return message from response data detail', () => {
      const error = {
        response: {
          status: 400,
          data: {
            detail: 'Dados inválidos'
          }
        }
      };
      
      expect(getErrorMessage(error)).toBe('Dados inválidos');
    });

    it('should return message from response data message', () => {
      const error = {
        response: {
          status: 400,
          data: {
            message: 'Produto não encontrado'
          }
        }
      };
      
      expect(getErrorMessage(error)).toBe('Produto não encontrado');
    });

    it('should return mapped message for HTTP 401', () => {
      const error = {
        response: {
          status: 401,
          data: {}
        }
      };
      
      expect(getErrorMessage(error)).toBe('Sessão expirada. Faça login novamente.');
    });

    it('should return mapped message for HTTP 403', () => {
      const error = {
        response: {
          status: 403,
          data: {}
        }
      };
      
      expect(getErrorMessage(error)).toBe('Você não tem permissão para realizar esta ação.');
    });

    it('should return mapped message for HTTP 404', () => {
      const error = {
        response: {
          status: 404,
          data: {}
        }
      };
      
      expect(getErrorMessage(error)).toBe('Recurso não encontrado.');
    });

    it('should return mapped message for HTTP 429', () => {
      const error = {
        response: {
          status: 429,
          data: {}
        }
      };
      
      expect(getErrorMessage(error)).toBe('Muitas requisições. Aguarde um momento e tente novamente.');
    });

    it('should return mapped message for HTTP 500', () => {
      const error = {
        response: {
          status: 500,
          data: {}
        }
      };
      
      expect(getErrorMessage(error)).toBe('Erro interno do servidor. Tente novamente mais tarde.');
    });

    it('should return unknown error message for unmapped status', () => {
      const error = {
        response: {
          status: 418,
          data: {}
        }
      };
      
      expect(getErrorMessage(error)).toBe('Ocorreu um erro inesperado. Tente novamente.');
    });

    it('should return unknown error message for null error', () => {
      expect(getErrorMessage(null)).toBe('Ocorreu um erro inesperado. Tente novamente.');
    });

    it('should return string error directly', () => {
      const error = {
        response: {
          status: 400,
          data: 'Erro simples'
        }
      };
      
      expect(getErrorMessage(error)).toBe('Erro simples');
    });

    it('should join validation errors', () => {
      const error = {
        response: {
          status: 422,
          data: {
            errors: [
              { msg: 'Nome é obrigatório' },
              { message: 'Preço inválido' }
            ]
          }
        }
      };
      
      expect(getErrorMessage(error)).toBe('Nome é obrigatório, Preço inválido');
    });
  });
});
