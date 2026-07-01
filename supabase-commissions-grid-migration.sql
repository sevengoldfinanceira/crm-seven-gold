-- =====================================================
-- Migração: Grade de comissionamento por parcela
-- Substitui Adesão/Parcelas/Total por grade 1° a 17°
-- =====================================================

-- Representante Junior
UPDATE commission_rules SET
  commission_value = '5,00',
  adhesion = NULL,
  installments = NULL,
  total = NULL,
  extra = '{"parcels":[0.60,0.20,0.20,0.15,0.20,0.20,0.25,0.20,0.25,0.35,0.35,0.35,0.40,0.40,0.40,0.30,0.30],"total":5.00}'
WHERE level_id = 'representante-junior' AND table_index = 0;

UPDATE commission_rules SET
  commission_value = '5,00',
  extra = '{"parcels":[1.00,0.20,0.20,0.20,0.30,0.30,0.30,0.35,0.35,0.30,0.40,0.40,0.40,0.30,null,null,null],"total":5.00}'
WHERE level_id = 'representante-junior' AND table_index = 1;

UPDATE commission_rules SET
  commission_value = '5,00',
  extra = '{"parcels":[1.90,0.25,0.30,0.30,0.35,0.35,0.35,0.38,0.42,0.40,null,null,null,null,null,null,null],"total":5.00}'
WHERE level_id = 'representante-junior' AND table_index = 2;

UPDATE commission_rules SET
  commission_value = '5,00',
  extra = '{"parcels":[2.50,0.25,0.35,0.35,0.30,0.35,0.35,0.45,0.15,null,null,null,null,null,null,null,null],"total":5.00}'
WHERE level_id = 'representante-junior' AND table_index = 3;

UPDATE commission_rules SET
  commission_value = '5,00',
  extra = '{"parcels":[3.00,0.30,0.35,0.35,0.35,0.35,0.30,null,null,null,null,null,null,null,null,null,null],"total":5.00}'
WHERE level_id = 'representante-junior' AND table_index = 4;

UPDATE commission_rules SET
  commission_value = '5,00',
  extra = '{"parcels":[3.70,0.25,0.30,0.30,0.35,0.10,null,null,null,null,null,null,null,null,null,null,null],"total":5.00}'
WHERE level_id = 'representante-junior' AND table_index = 5;

UPDATE commission_rules SET
  commission_value = '5,00',
  extra = '{"parcels":[4.50,0.10,0.20,0.15,0.05,null,null,null,null,null,null,null,null,null,null,null,null],"total":5.00}'
WHERE level_id = 'representante-junior' AND table_index = 6;

-- Representante Pleno (mesmos valores)
UPDATE commission_rules SET
  commission_value = '5,00',
  adhesion = NULL,
  installments = NULL,
  total = NULL,
  extra = '{"parcels":[0.60,0.20,0.20,0.15,0.20,0.20,0.25,0.20,0.25,0.35,0.35,0.35,0.40,0.40,0.40,0.30,0.30],"total":5.00}'
WHERE level_id = 'representante-pleno' AND table_index = 0;

UPDATE commission_rules SET
  commission_value = '5,00',
  extra = '{"parcels":[1.00,0.20,0.20,0.20,0.30,0.30,0.30,0.35,0.35,0.30,0.40,0.40,0.40,0.30,null,null,null],"total":5.00}'
WHERE level_id = 'representante-pleno' AND table_index = 1;

UPDATE commission_rules SET
  commission_value = '5,00',
  extra = '{"parcels":[1.90,0.25,0.30,0.30,0.35,0.35,0.35,0.38,0.42,0.40,null,null,null,null,null,null,null],"total":5.00}'
WHERE level_id = 'representante-pleno' AND table_index = 2;

UPDATE commission_rules SET
  commission_value = '5,00',
  extra = '{"parcels":[2.50,0.25,0.35,0.35,0.30,0.35,0.35,0.45,0.15,null,null,null,null,null,null,null,null],"total":5.00}'
WHERE level_id = 'representante-pleno' AND table_index = 3;

UPDATE commission_rules SET
  commission_value = '5,00',
  extra = '{"parcels":[3.00,0.30,0.35,0.35,0.35,0.35,0.30,null,null,null,null,null,null,null,null,null,null],"total":5.00}'
WHERE level_id = 'representante-pleno' AND table_index = 4;

UPDATE commission_rules SET
  commission_value = '5,00',
  extra = '{"parcels":[3.70,0.25,0.30,0.30,0.35,0.10,null,null,null,null,null,null,null,null,null,null,null],"total":5.00}'
WHERE level_id = 'representante-pleno' AND table_index = 5;

UPDATE commission_rules SET
  commission_value = '5,00',
  extra = '{"parcels":[4.50,0.10,0.20,0.15,0.05,null,null,null,null,null,null,null,null,null,null,null,null],"total":5.00}'
WHERE level_id = 'representante-pleno' AND table_index = 6;

-- Submaster (mesmos valores)
UPDATE commission_rules SET
  commission_value = '5,00',
  adhesion = NULL,
  installments = NULL,
  total = NULL,
  extra = '{"parcels":[0.60,0.20,0.20,0.15,0.20,0.20,0.25,0.20,0.25,0.35,0.35,0.35,0.40,0.40,0.40,0.30,0.30],"total":5.00}'
WHERE level_id = 'submaster' AND table_index = 0;

UPDATE commission_rules SET
  commission_value = '5,00',
  extra = '{"parcels":[1.00,0.20,0.20,0.20,0.30,0.30,0.30,0.35,0.35,0.30,0.40,0.40,0.40,0.30,null,null,null],"total":5.00}'
WHERE level_id = 'submaster' AND table_index = 1;

UPDATE commission_rules SET
  commission_value = '5,00',
  extra = '{"parcels":[1.90,0.25,0.30,0.30,0.35,0.35,0.35,0.38,0.42,0.40,null,null,null,null,null,null,null],"total":5.00}'
WHERE level_id = 'submaster' AND table_index = 2;

UPDATE commission_rules SET
  commission_value = '5,00',
  extra = '{"parcels":[2.50,0.25,0.35,0.35,0.30,0.35,0.35,0.45,0.15,null,null,null,null,null,null,null,null],"total":5.00}'
WHERE level_id = 'submaster' AND table_index = 3;

UPDATE commission_rules SET
  commission_value = '5,00',
  extra = '{"parcels":[3.00,0.30,0.35,0.35,0.35,0.35,0.30,null,null,null,null,null,null,null,null,null,null],"total":5.00}'
WHERE level_id = 'submaster' AND table_index = 4;

UPDATE commission_rules SET
  commission_value = '5,00',
  extra = '{"parcels":[3.70,0.25,0.30,0.30,0.35,0.10,null,null,null,null,null,null,null,null,null,null,null],"total":5.00}'
WHERE level_id = 'submaster' AND table_index = 5;

UPDATE commission_rules SET
  commission_value = '5,00',
  extra = '{"parcels":[4.50,0.10,0.20,0.15,0.05,null,null,null,null,null,null,null,null,null,null,null,null],"total":5.00}'
WHERE level_id = 'submaster' AND table_index = 6;
