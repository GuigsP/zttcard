# Coluna "Nome real" na lista de cartas do admin

## O que muda

Na aba de cartas do painel admin, a tabela passa a mostrar o nome real do atleta ao lado do nome fictício da carta, para facilitar a organização.

- Nova coluna **NOME REAL** logo depois da coluna **NOME**, mostrando `—` quando o campo estiver vazio.
- A busca por texto passa a procurar tanto no nome da carta quanto no nome real (hoje só olha o nome da carta).

## Detalhes técnicos

- `src/routes/admin.tsx`: adicionar `<th>NOME REAL</th>` no cabeçalho e a `<td>` correspondente (`c.real_name || "—"`); ajustar o `colSpan` da linha "nenhuma carta" de 8 para 9.
- Ajustar o filtro de busca (linha do `.filter((c) => !q || c.name...)`) para incluir `c.real_name`.
- Nenhuma mudança de banco de dados: o campo `real_name` já existe e já vem no `listAllCards`.
