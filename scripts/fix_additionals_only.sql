-- ============================================================
-- Apenas atualiza o campo additionals do Monte sua Salada
-- Cole no SQL Editor do Supabase e execute
-- ============================================================

UPDATE products
SET additionals = jsonb_build_array(
  jsonb_build_object('name','Mix de folhas','price',5.00,'category','base_folhas','required',false,'min_select',1,'max_select',2),
  jsonb_build_object('name','Alface americana','price',3.00,'category','base_folhas','required',false,'min_select',0,'max_select',2),
  jsonb_build_object('name','Rúcula','price',3.00,'category','base_folhas','required',false,'min_select',0,'max_select',2),
  jsonb_build_object('name','Repolho roxo','price',3.00,'category','base_folhas','required',false,'min_select',0,'max_select',2),

  jsonb_build_object('name','Frango','price',9.00,'category','proteina','required',true,'min_select',1,'max_select',1),
  jsonb_build_object('name','Atum','price',8.50,'category','proteina','required',true,'min_select',1,'max_select',1),
  jsonb_build_object('name','Carne moída (patinho)','price',9.00,'category','proteina','required',true,'min_select',1,'max_select',1),
  jsonb_build_object('name','Carne em cubos (patinho)','price',9.00,'category','proteina','required',true,'min_select',1,'max_select',1),
  jsonb_build_object('name','Ovo cozido','price',3.50,'category','proteina','required',false,'min_select',0,'max_select',3),

  jsonb_build_object('name','Cenoura','price',3.00,'category','legumes','required',false,'min_select',0,'max_select',3),
  jsonb_build_object('name','Tomate','price',2.50,'category','legumes','required',false,'min_select',0,'max_select',3),
  jsonb_build_object('name','Tomate cereja','price',3.50,'category','legumes','required',false,'min_select',0,'max_select',3),
  jsonb_build_object('name','Pepino','price',3.00,'category','legumes','required',false,'min_select',0,'max_select',3),
  jsonb_build_object('name','Beterraba','price',3.50,'category','legumes','required',false,'min_select',0,'max_select',3),
  jsonb_build_object('name','Cebola roxa','price',2.50,'category','legumes','required',false,'min_select',0,'max_select',3),
  jsonb_build_object('name','Salsa','price',2.00,'category','legumes','required',false,'min_select',0,'max_select',3),
  jsonb_build_object('name','Cebolinha','price',2.00,'category','legumes','required',false,'min_select',0,'max_select',3),
  jsonb_build_object('name','Brócolis','price',4.00,'category','legumes','required',false,'min_select',0,'max_select',3),

  jsonb_build_object('name','Manga','price',3.50,'category','frutas','required',true,'min_select',1,'max_select',1),
  jsonb_build_object('name','Maçã','price',3.00,'category','frutas','required',true,'min_select',1,'max_select',1),
  jsonb_build_object('name','Morango','price',4.00,'category','frutas','required',true,'min_select',1,'max_select',1),
  jsonb_build_object('name','Abacate','price',3.00,'category','frutas','required',false,'min_select',0,'max_select',3),

  jsonb_build_object('name','Batata palha','price',3.50,'category','extras','required',false,'min_select',0,'max_select',1),
  jsonb_build_object('name','Castanha de caju','price',8.00,'category','extras','required',false,'min_select',0,'max_select',1),
  jsonb_build_object('name','Castanha do Pará','price',8.00,'category','extras','required',false,'min_select',0,'max_select',1),
  jsonb_build_object('name','Amêndoas laminadas','price',6.00,'category','extras','required',false,'min_select',0,'max_select',1),
  jsonb_build_object('name','Queijo parmesão','price',3.00,'category','extras','required',false,'min_select',0,'max_select',1),
  jsonb_build_object('name','Croutons','price',4.50,'category','extras','required',false,'min_select',0,'max_select',1),
  jsonb_build_object('name','Gergelim','price',2.00,'category','extras','required',false,'min_select',0,'max_select',3),

  jsonb_build_object('name','Creme de abacate','price',5.00,'category','molhos','required',true,'min_select',1,'max_select',1),
  jsonb_build_object('name','Molho verde fit','price',5.00,'category','molhos','required',true,'min_select',1,'max_select',1),
  jsonb_build_object('name','Molho especial tipo MC','price',5.00,'category','molhos','required',true,'min_select',1,'max_select',1),
  jsonb_build_object('name','Mostarda e mel','price',5.00,'category','molhos','required',true,'min_select',1,'max_select',1),

  jsonb_build_object('name','Azeite','price',2.00,'category','temperos','required',false,'min_select',0,'max_select',3),
  jsonb_build_object('name','Sal','price',0.00,'category','temperos','required',false,'min_select',0,'max_select',3),
  jsonb_build_object('name','Orégano','price',1.00,'category','temperos','required',false,'min_select',0,'max_select',3)
)
WHERE name ILIKE '%monte%salada%';

-- Verificar
SELECT id, name, price, jsonb_array_length(additionals) AS total
FROM products
WHERE name ILIKE '%monte%salada%';
