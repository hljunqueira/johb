# Diretrizes de Tipagem e Manutenção Python (JOHB Backend)

## 1. Tratamento e Validação de Tipos (FastAPI / Pyrefly / Pyright)
- **FastAPI Form Data (`request.form()`)**:
  - Valores obtidos por `form.get(key)` retornam o tipo union `UploadFile | str | None`.
  - Sempre utilize verificação explícita com `isinstance(val, str)` antes de realizar conversões numéricas (`int(val)`) ou invocar métodos de string (`.strip()`), garantindo que o analisador estático não aponte erro de atribuição com `UploadFile`.
- **Valores Opcionais em Dicionários JSON / Partial Updates**:
  - Quando um campo puder receber explicitamente `null` no JSON (ex.: `request.get("price")`), utilize verificação segura `is not None` antes de aplicar `float(...)` ou `int(...)`, evitando erros de conversão de `NoneType`.
- **Escopo e Importação de Módulos**:
  - Evitar importar módulos utilitários (como `json`) dentro de blocos de funções locais se eles já foram importados no escopo global do arquivo, prevenindo alertas de variáveis não inicializadas no bloco `except`.
- **Ciclo de Vida do FastAPI**:
  - Utilizar `@asynccontextmanager` com `lifespan(app: FastAPI)` em vez dos decoradores obsoletos `@app.on_event("startup")` e `@app.on_event("shutdown")`.

## 2. Analisador Estático e Buffers Virtuais em Memória
- Problemas apontados no caminho `c:\__pyrefly_virtual__\inmemory\...` são artefatos temporários de edição em memória do analisador Pyrefly.
- Para limpar esses avisos fantasmas na IDE, basta executar o comando **`Developer: Reload Window`** ou fechar e reabrir as abas ativas.
