/**
 * @file plugins/themes/default/js/main.js
 *
 * Copyright (c) 2014-2017 Simon Fraser University
 * Copyright (c) 2000-2017 John Willinsky
 * Distributed under the GNU GPL v2. For full terms see the file docs/COPYING.
 *
 * @brief Handle JavaScript functionality unique to this theme.
 */
(function($) {
var $contextOptinGroup = $('div#contextOptinGroup');
	if ($contextOptinGroup.length) {
		var $roles = $contextOptinGroup.find('.context_roles :checkbox');
		$roles.change(function() {
			var $thisRoles = $(this).closest('.context_roles');
			var cntx=$(this).attr("cntx");
			if ($thisRoles.find(':checked').length) {
				$('.journal_'+cntx).addClass('context_privacy_visible');
			} else {
				$('.journal_'+cntx).removeClass('context_privacy_visible');
			}
		});
	}
    
    if (typeof $.fn.tagit !== 'undefined') {
		$('.tag-it').each(function() {
			var autocomplete_url = $(this).data('autocomplete-url');
			$(this).tagit({
				fieldName: $(this).data('field-name'),
				allowSpaces: true,
				autocomplete: {
					source: function(request, response) {
						$.ajax({
							url: autocomplete_url,
							data: {term: request.term},
							dataType: 'json',
							success: function(jsonData) {
								if (jsonData.status == true) {
									response(jsonData.content);
								}
							}
						});
					},
				},
			});
		});

		/**
		 * Determine if the user has opted to register as a reviewer
		 *
		 * @see: /templates/frontend/pages/userRegister.tpl
		 */
		function isReviewerSelected() {
			var group = $('#reviewerOptinGroup').find('input');
			var is_checked = false;
			group.each(function() {
				if ($(this).is(':checked')) {
					is_checked = true;
					return false;
				}
			});

			return is_checked;
		}

		/**
		 * Reveal the reviewer interests field on the registration form when a
		 * user has opted to register as a reviewer
		 *
		 * @see: /templates/frontend/pages/userRegister.tpl
		 */
		function reviewerInterestsToggle() {
			var is_checked = isReviewerSelected();
			if (is_checked) {
				$('#reviewerInterests').addClass('is_visible');
			} else {
				$('#reviewerInterests').removeClass('is_visible');
			}
		}

		// Update interests on page load and when the toggled is toggled
		reviewerInterestsToggle();
		$('#reviewerOptinGroup input').click(reviewerInterestsToggle);
	}
	
})(jQuery);
