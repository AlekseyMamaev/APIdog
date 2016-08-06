<?

	$pagePrefix = "pro";

	include_once "zero.framework.v6.5.php";
	include_once "zero.helper.php";

	if (!CURRENT_USER_ID && $_REQUEST["act"] != "result") {
		exit(header("Location: /"));
	};

	switch ($_REQUEST["act"]) {

		case "result":
			$amount = $_REQUEST["withdraw_amount"]; // снятые деньги, а не перечисленные. позже доделать
			$orderId = $_REQUEST["label"];
			$operationId = $_REQUEST["operation_id"];
			$mail = $_REQUEST["email"];

			APIdogOrder::confirm($orderId, $amount);
			break;

		// сюда отправляет Я.Д пользователя после успешной оплаты
		case "done":

			$orderId = (int) $_REQUEST["orderId"];
			$order = APIdogOrder::getOrderById($orderId);
			template(APIdogTemplateTop);

?>
<div class="about-text">
	<h1>Вы успешно оплатили услугу.</h1>
	<a href="/6.5/pro.php">Назад к магазину</a> | <a href="/">Назад на сайт</a>
</div>
<?

			template(APIdogTemplateBottom);

			break;

		default:
			template(APIdogTemplateTop);

			$paid = APIdogProduct::getPayed();
			$items = APIdogProduct::getAll();


			foreach ($items as $p) {
?>
<div class="product-item">
	<h3><?=$p->title;?></h3>
	<p><?=$p->description;?></p>
	<p><?=getLabel("_amountName");?>: <?=$p->amount;?> <?=getLabel("_amountCurrency");?> (<?=getLabel("_periods")[$p->period];?>)</p>
<?
				if (!$paid[$p->productId] && !($analog = $p->getAnalogBought($paid))) {
?>
	<div class="btn" onclick="Pro.goToPay(<?=$p->productId;?>, this)" data-product="<?=htmlSpecialChars(json_encode($p, JSON_UNESCAPED_UNICODE))?>"><?=getLabel("_buy");?></div>
<?
				} else {

					$b = $paid[$analog ? $analog : $p->productId];
					if ($b->untilDate) {
?>
	<div class="tip"><?=sprintf(getLabel("_boughtPeriod"), date("d.m.Y H:i", $b->untilDate));?></div>
<?
					} else {
?>
	<div class="tip"><?=getLabel("_boughtForever");?></div>
<?
					}
				}
?>
</div>
<?
			}

			template(APIdogTemplateBottom);

	}