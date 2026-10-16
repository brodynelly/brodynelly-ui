<script>
	import '$lib/styles.css';
	import { base } from '$app/paths';
	import {
		ActionSheet,
		ActionSheetButton,
		Alert,
		AlertButton,
		AlertTextField,
		Button,
		Collection,
		List,
		ListButtonRow,
		ListRow,
		ListRowButtonTrailing,
		ListRowDefaultTrailing,
		ListRowDisclosureTrailing,
		ListRowImage,
		ListRowStepperTrailing,
		ListRowToggleTrailing,
		ListSliderRow,
		ListTextFieldRow,
		NavigationBar,
		NavigationBarLeading,
		NavigationBarSearchField,
		NavigationBarTrailing,
		PageControl,
		PageControlButton,
		RegularProgressIndicator,
		SmallProgressIndicator,
		SegmentedControl,
		SegmentedControlButton,
		Sidebar,
		SidebarNavigationBar,
		SidebarNavigationBarLeading,
		SidebarNavigationBarTrailing,
		SidebarSection,
		SidebarSectionAddItemButton,
		SidebarSectionItem,
		TabBar,
		TabBarButton,
		Toolbar,
		ToolbarButton,
		Version26ActionSheet,
		Version26ActionSheetButton,
		Version26Alert,
		Version26AlertButton,
		Version26AlertTextField,
		Version26Button,
		Version26List,
		Version26ListButtonRow,
		Version26ListRow,
		Version26ListRowButtonTrailing,
		Version26ListRowDefaultTrailing,
		Version26ListRowDisclosureTrailing,
		Version26ListRowImage,
		Version26ListRowStepperTrailing,
		Version26ListRowToggleTrailing,
		Version26ListSliderRow,
		Version26ListTextFieldRow,
		Version26SegmentedControl,
		Version26SegmentedControlButton,
		Version26Sidebar,
		Version26SidebarNavigationBar,
		Version26SidebarNavigationBarLeading,
		Version26SidebarNavigationBarTrailing,
		Version26SidebarSection,
		Version26SidebarSectionAddItemButton,
		Version26SidebarSectionItem,
		Version26TabBar,
		Version26TabBarButton,
		Version26Toolbar,
		Version26ToolbarButton
	} from '$lib';

	let actionSheetState = 'hidden';
	let alertState = 'hidden';
	let v26ActionSheetState = 'hidden';
	let v26AlertState = 'hidden';

	const blueImage =
		"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64'%3E%3Crect width='64' height='64' fill='%230088ff'/%3E%3C/svg%3E";
	const pinkImage =
		"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64'%3E%3Crect width='64' height='64' fill='%23ff2d55'/%3E%3C/svg%3E";
	const greenImage =
		"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64'%3E%3Crect width='64' height='64' fill='%2334c759'/%3E%3C/svg%3E";
</script>

<svelte:head>
	<title>Brodynelly UI — Component Showcase</title>
	<link
		rel="stylesheet"
		href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
	/>
</svelte:head>

<Sidebar>
	<SidebarNavigationBar scrollPosition="top" title="Brodynelly UI">
		<SidebarNavigationBarLeading slot="leading" symbol="menu" />
		<SidebarNavigationBarTrailing slot="trailing" symbol="add" />
	</SidebarNavigationBar>

	<SidebarSection showHeading heading="Library">
		<SidebarSectionItem
			inputGroup="nav-library"
			state="selected"
			showImage
			symbol="grid_view"
			title="Buttons"
			behavior="hyperlink"
			href="#buttons"
		/>
		<SidebarSectionItem
			inputGroup="nav-library"
			showImage
			symbol="list"
			title="Lists"
			showSubtitle
			subtitle="Rows & trailing accessories"
			behavior="hyperlink"
			href="#lists"
		/>
		<SidebarSectionItem
			inputGroup="nav-library"
			showImage
			symbol="explore"
			title="Navigation Bars"
			showDetail
			detail="3"
			behavior="hyperlink"
			href="#navigation-bars"
		/>
		<SidebarSectionItem
			inputGroup="nav-library"
			showImage
			symbol="space_dashboard"
			title="Tab Bars & Toolbars"
			showTrailingSymbol
			trailingSymbol="info"
			behavior="hyperlink"
			href="#bars"
		/>
		<SidebarSectionItem
			inputGroup="nav-library"
			showImage
			symbol="data_usage"
			title="Progress & Page Control"
			behavior="hyperlink"
			href="#progress"
		/>
		<SidebarSectionItem
			inputGroup="nav-library"
			showImage
			symbol="radio_button_checked"
			title="Segmented Controls"
			behavior="hyperlink"
			href="#segmented"
		/>
	</SidebarSection>

	<SidebarSection showHeading heading="Version 26">
		<SidebarSectionItem
			inputGroup="nav-v26"
			showDisclosure
			disclosureState="open"
			title="Liquid Glass"
		>
			<SidebarSectionItem
				indentLevel="1"
				inputGroup="nav-v26-child"
				title="Buttons"
				behavior="hyperlink"
				href="#v26-buttons"
			/>
			<SidebarSectionItem
				indentLevel="2"
				inputGroup="nav-v26-child"
				title="Lists"
				behavior="hyperlink"
				href="#v26-lists"
			/>
		</SidebarSectionItem>
		<SidebarSectionItem
			inputGroup="nav-v26"
			showImage
			imageType="bitmap"
			image={blueImage}
			imageAlt="Blue tile"
			title="Glass Sidebar"
			behavior="hyperlink"
			href="#v26-sidebar"
		/>
		<SidebarSectionItem
			inputGroup="nav-v26"
			showImage
			imageType="collection"
			title="Glass Bars"
			showDetail
			detail="2"
			behavior="hyperlink"
			href="#v26-bars"
		/>
		<SidebarSectionAddItemButton title="New Section" />
	</SidebarSection>

	<SidebarSection showHeading heading="Overlays">
		<SidebarSectionItem
			inputGroup="nav-overlays"
			showImage
			symbol="layers"
			title="Action Sheets & Alerts"
			behavior="hyperlink"
			href="#overlays"
		/>
	</SidebarSection>

	<SidebarSection showHeading heading="Archived" state="closed" />
</Sidebar>

<main class="content">
	<h1 class="large-title-emphasized">Brodynelly UI</h1>
	<nav class="new-components" aria-label="New component previews">
		<a href={`${base}/`}>Brodynelly UI — source catalog</a>
		<a href={`${base}/setup`}>Setup</a>
		<a href={`${base}/windows`}>Windows — Figma reference <span aria-hidden="true">↗</span></a>
		<a href={`${base}/components`}>Interactive components <span aria-hidden="true">↗</span></a>
	</nav>
	<p class="kicker">
		UI component library for Svelte based on Apple's Human Interface design language. Every public
		component is rendered below.
	</p>

	<h2 class="title2-emphasized" id="buttons">Buttons</h2>
	<p class="note">
		Button — borderless, bezeled-gray, bezeled and filled types in all three sizes, plus disabled
		states.
	</p>
	<div class="row-flex">
		<Button symbol="play_arrow" label="Play" />
		<Button size="medium" symbol="play_arrow" label="Play" />
		<Button size="large" symbol="play_arrow" label="Play" />
		<Button type="bezeled-gray" symbol="play_arrow" label="Play" />
		<Button type="bezeled" symbol="play_arrow" label="Play" />
		<Button type="filled" symbol="play_arrow" label="Play" />
		<Button type="filled" size="medium" labelType="text" label="Continue" />
		<Button type="filled" size="medium" labelType="symbol" symbol="play_arrow" />
		<Button type="filled" size="large" labelType="text" label="Get Started" />
		<Button state="disabled" symbol="play_arrow" label="Play" />
		<Button state="disabled" type="filled" symbol="play_arrow" label="Play" />
	</div>
	<div class="material-strip">
		<p class="caption2-emphasized">onMaterial</p>
		<Button onMaterial state="disabled" type="filled" symbol="play_arrow" label="Play" />
		<Button onMaterial state="disabled" symbol="play_arrow" label="Play" />
	</div>

	<h2 class="title2-emphasized" id="v26-buttons">Version 26 Buttons</h2>
	<p class="note">Version26Button — liquid glass buttons in all sizes and label types.</p>
	<div class="row-flex">
		<Version26Button symbol="play_arrow" label="Play" />
		<Version26Button size="medium" symbol="play_arrow" label="Play" />
		<Version26Button size="large" symbol="play_arrow" label="Play" />
		<Version26Button size="medium" labelType="text" label="Continue" />
		<Version26Button size="medium" labelType="symbol" symbol="play_arrow" />
		<Version26Button size="large" labelType="text" label="Get Started" />
	</div>

	<h2 class="title2-emphasized" id="lists">Lists</h2>
	<p class="note">
		List with every row and trailing accessory, wrapped in a Collection grid (default, plain and
		prominent header types).
	</p>
	<Collection>
		<List showHeader header="Reminders" showFooter footer="A grouped list with header and footer.">
			<ListRow title="Buy groceries" showSubtitle subtitle="Milk, eggs, bread">
				<ListRowButtonTrailing slot="trailing" label="Edit" />
			</ListRow>
			<ListRow title="Favorites">
				<ListRowDefaultTrailing slot="trailing" showDetail detail="12" showDisclosure />
			</ListRow>
			<ListRow title="Airplane Mode">
				<ListRowToggleTrailing slot="trailing" />
			</ListRow>
			<ListRow height="tall" title="Volume" showSubtitle subtitle="Adjust with the stepper">
				<ListRowImage slot="image" type="fill" image={blueImage} imageAlt="Blue tile" />
				<ListRowStepperTrailing slot="trailing" />
			</ListRow>
			<ListSliderRow value="40" showSymbols />
			<ListTextFieldRow title="Nickname" placeholder="Value" value="" />
		</List>

		<List showHeader headerType="plain" header="Media">
			<ListRow title="Circular image">
				<ListRowImage slot="image" type="circular" image={pinkImage} imageAlt="Pink circle" />
				<ListRowDefaultTrailing slot="trailing" showCheckmark />
			</ListRow>
			<ListRow title="Rounded image">
				<ListRowImage slot="image" type="rounded" image={greenImage} imageAlt="Green square" />
				<ListRowDisclosureTrailing slot="trailing" showDetail detail="3 songs" />
			</ListRow>
			<ListRow title="Symbol image">
				<ListRowImage slot="image" type="symbol" symbol="star" />
				<ListRowDefaultTrailing slot="trailing" showSymbol showInfo />
			</ListRow>
			<ListButtonRow type="enabled" label="Add to Playlist" />
		</List>

		<List showHeader headerType="prominent" header="Edit Mode">
			<ListRow showEditButton title="Tap to select" />
			<ListRow showEditButton checkmarkEditButtonState="selected" title="Selected row" />
			<ListRow showEditButton editButtonType="plus" title="Add Music" />
			<ListRow showEditButton editButtonType="minus" title="Remove Song" />
			<ListButtonRow type="destructive" label="Delete List" />
			<ListButtonRow type="disabled" label="Unavailable" />
			<ListRow title="Accent toggle">
				<ListRowToggleTrailing slot="trailing" showAccentColor />
			</ListRow>
			<ListRow title="Off toggle">
				<ListRowToggleTrailing slot="trailing" state="off" />
			</ListRow>
		</List>

		<List showHeader headerType="plain" header="Details">
			<ListRow title="Notifications">
				<ListRowDefaultTrailing slot="trailing" showDetail detail="On" />
			</ListRow>
			<ListRow title="Version">
				<ListRowDefaultTrailing slot="trailing" showDetail detail="2.0.12" showInfo />
			</ListRow>
			<ListRow title="Disclosure only">
				<ListRowDefaultTrailing slot="trailing" showDisclosure />
			</ListRow>
			<ListRow title="Everything">
				<ListRowDefaultTrailing
					slot="trailing"
					showDetail
					detail="Mix"
					showSymbol
					showInfo
					showCheckmark
					showDisclosure
				/>
			</ListRow>
			<ListSliderRow value="70" />
		</List>
	</Collection>

	<h2 class="title2-emphasized" id="v26-lists">Version 26 Lists</h2>
	<p class="note">
		Version26List — 26px corner radius, 52px regular rows and liquid glass toggles.
	</p>
	<Collection>
		<Version26List
			showHeader
			header="Now Playing"
			showFooter
			footer="A grouped list with header and footer."
		>
			<Version26ListRow title="Blinding Lights">
				<Version26ListRowImage slot="image" type="fill" image={blueImage} imageAlt="Blue tile" />
				<Version26ListRowDefaultTrailing slot="trailing" showDetail detail="3:20" showDisclosure />
			</Version26ListRow>
			<Version26ListRow title="Levitating">
				<Version26ListRowImage
					slot="image"
					type="circular"
					image={pinkImage}
					imageAlt="Pink circle"
				/>
				<Version26ListRowButtonTrailing slot="trailing" label="Play" />
			</Version26ListRow>
			<Version26ListRow title="Wi-Fi">
				<Version26ListRowToggleTrailing slot="trailing" />
			</Version26ListRow>
			<Version26ListRow height="tall" title="Brightness" showSubtitle subtitle="Slide to adjust">
				<Version26ListRowImage
					slot="image"
					type="rounded"
					image={greenImage}
					imageAlt="Green square"
				/>
				<Version26ListRowStepperTrailing slot="trailing" />
			</Version26ListRow>
			<Version26ListSliderRow value="60" showSymbols />
			<Version26ListTextFieldRow placeholder="Search music" value="" />
		</Version26List>

		<Version26List showHeader headerType="plain" header="Library" detail="See All">
			<Version26ListRow showEditButton title="Tap to select" />
			<Version26ListRow showEditButton checkmarkEditButtonState="selected" title="Selected row" />
			<Version26ListRow showEditButton editButtonType="plus" title="Add Music" />
			<Version26ListRow showEditButton editButtonType="minus" title="Remove Music" />
			<Version26ListRow title="Starred">
				<Version26ListRowImage slot="image" type="symbol" symbol="star" />
				<Version26ListRowDefaultTrailing slot="trailing" showSymbol showInfo showCheckmark />
			</Version26ListRow>
			<Version26ListRow title="Open">
				<Version26ListRowDisclosureTrailing slot="trailing" showDetail detail="12" />
			</Version26ListRow>
			<Version26ListRow title="Accent toggle">
				<Version26ListRowToggleTrailing slot="trailing" showAccentColor />
			</Version26ListRow>
			<Version26ListRow title="Off toggle">
				<Version26ListRowToggleTrailing slot="trailing" state="off" />
			</Version26ListRow>
			<Version26ListButtonRow type="enabled" label="Add to Library" />
			<Version26ListButtonRow type="destructive" label="Delete Music" />
			<Version26ListButtonRow type="disabled" label="Unavailable" />
		</Version26List>

		<Version26List showHeader headerType="prominent" header="Prominent Header" detail="Edit">
			<Version26ListRow height="tall" title="Tall row" showSubtitle subtitle="68px tall" />
			<Version26ListRow title="Regular row" />
		</Version26List>
	</Collection>

	<h2 class="title2-emphasized" id="navigation-bars">Navigation Bars</h2>
	<p class="note">
		NavigationBar with leading and trailing items (enabled and disabled), a chrome background, and a
		search field.
	</p>
	<NavigationBar title="Home" style="margin: 24px 0px;">
		<NavigationBarLeading slot="leading" symbol="arrow_back_ios_new" label="Back" />
		<NavigationBarTrailing slot="trailing-1" symbol="more_horiz" />
		<NavigationBarTrailing slot="trailing-2" type="text" label="Edit" />
		<NavigationBarTrailing slot="trailing-3" type="text-emphasized" label="Done" />
	</NavigationBar>
	<NavigationBar showBackground title="Settings" style="margin: 24px 0px;">
		<NavigationBarLeading
			slot="leading"
			state="disabled"
			symbol="arrow_back_ios_new"
			label="Back"
		/>
		<NavigationBarTrailing slot="trailing-1" state="disabled" symbol="more_horiz" />
	</NavigationBar>
	<NavigationBar showBackground title="Search" style="margin: 24px 0px;">
		<NavigationBarSearchField slot="search-field" value="" />
	</NavigationBar>

	<h2 class="title2-emphasized" id="bars">Tab Bars & Toolbars</h2>
	<p class="note">
		TabBar and Toolbar are fixed to the bottom edge, so they are shown inside device mockups.
	</p>
	<div class="device-grid">
		<div class="device bar-device">
			<TabBar style="left: 0px; right: 0px;">
				<TabBarButton inputGroup="tab-classic" state="selected" symbol="home" label="Home" />
				<TabBarButton inputGroup="tab-classic" symbol="search" label="Search" />
				<TabBarButton inputGroup="tab-classic" symbol="favorite" label="Favorites" />
				<TabBarButton inputGroup="tab-classic" symbol="person" label="Profile" />
			</TabBar>
		</div>
		<div class="device bar-device">
			<Toolbar style="left: 0px; right: 0px;">
				<ToolbarButton symbol="add" />
				<ToolbarButton type="label" label="Options" />
				<ToolbarButton symbol="info" />
			</Toolbar>
		</div>
	</div>

	<h2 class="title2-emphasized" id="v26-bars">Version 26 Tab Bars & Toolbars</h2>
	<p class="note">
		Version26TabBar floats as a liquid glass pill; Version26Toolbar uses glass circles.
	</p>
	<div class="device-grid">
		<div class="device bar-device">
			<Version26TabBar style="left: 20px; right: 20px; width: auto;">
				<Version26TabBarButton inputGroup="tab-v26" state="selected" symbol="home" label="Home" />
				<Version26TabBarButton inputGroup="tab-v26" symbol="search" label="Search" />
				<Version26TabBarButton inputGroup="tab-v26" symbol="favorite" label="Favorites" />
				<Version26TabBarButton inputGroup="tab-v26" symbol="person" label="Profile" />
			</Version26TabBar>
		</div>
		<div class="device bar-device">
			<Version26Toolbar style="left: 0px; right: 0px;">
				<Version26ToolbarButton symbol="add" />
				<Version26ToolbarButton symbol="edit" />
				<Version26ToolbarButton symbol="info" />
			</Version26Toolbar>
		</div>
	</div>

	<h2 class="title2-emphasized" id="progress">Progress Indicators & Page Control</h2>
	<p class="note">Regular and small activity spinners, with and without status labels.</p>
	<div class="row-flex">
		<RegularProgressIndicator />
		<RegularProgressIndicator showLabel label="Loading…" />
		<SmallProgressIndicator />
		<SmallProgressIndicator showLabel label="Syncing…" />
	</div>
	<p class="note">PageControl dots, plain and on an ultrathin platter.</p>
	<div class="row-flex">
		<PageControl>
			<PageControlButton inputGroup="pc-a" />
			<PageControlButton inputGroup="pc-a" state="selected" />
			<PageControlButton inputGroup="pc-a" />
			<PageControlButton inputGroup="pc-a" />
		</PageControl>
		<PageControl showPlatter>
			<PageControlButton inputGroup="pc-b" />
			<PageControlButton inputGroup="pc-b" />
			<PageControlButton inputGroup="pc-b" state="selected" />
			<PageControlButton inputGroup="pc-b" />
			<PageControlButton inputGroup="pc-b" />
		</PageControl>
	</div>

	<h2 class="title2-emphasized" id="segmented">Segmented Controls</h2>
	<div class="demo-width">
		<SegmentedControl>
			<SegmentedControlButton inputGroup="seg-classic" label="Day" />
			<SegmentedControlButton inputGroup="seg-classic" state="selected" label="Week" />
			<SegmentedControlButton inputGroup="seg-classic" label="Month" />
			<SegmentedControlButton inputGroup="seg-classic" label="Year" />
		</SegmentedControl>
	</div>
	<div class="demo-width segmented-gap">
		<Version26SegmentedControl>
			<Version26SegmentedControlButton inputGroup="seg-v26" state="selected" label="Grid" />
			<Version26SegmentedControlButton inputGroup="seg-v26" label="List" />
			<Version26SegmentedControlButton inputGroup="seg-v26" label="Map" />
		</Version26SegmentedControl>
	</div>

	<h2 class="title2-emphasized" id="v26-sidebar">Version 26 Sidebar</h2>
	<p class="note">Version26Sidebar rendered inside a device mockup with a glass navigation bar.</p>
	<div class="device sidebar-device">
		<Version26Sidebar>
			<Version26SidebarNavigationBar scrollPosition="lower" title="Library">
				<Version26SidebarNavigationBarLeading slot="leading" symbol="menu" />
				<Version26SidebarNavigationBarTrailing slot="trailing" symbol="add" />
			</Version26SidebarNavigationBar>
			<Version26SidebarSection showHeading heading="Photos">
				<Version26SidebarSectionItem
					inputGroup="v26-nav"
					state="selected"
					showImage
					symbol="photo"
					title="All Photos"
					showDetail
					detail="128"
				/>
				<Version26SidebarSectionItem
					inputGroup="v26-nav"
					showImage
					imageType="collection"
					title="Albums"
				/>
				<Version26SidebarSectionItem
					inputGroup="v26-nav"
					showImage
					symbol="favorite"
					title="Favorites"
					showSubtitle
					subtitle="12 items"
				/>
				<Version26SidebarSectionItem inputGroup="v26-nav" showDisclosure title="Shared">
					<Version26SidebarSectionItem
						indentLevel="1"
						inputGroup="v26-nav-child"
						showImage
						symbol="group"
						title="Family"
					/>
				</Version26SidebarSectionItem>
				<Version26SidebarSectionAddItemButton title="New Album" />
			</Version26SidebarSection>
			<Version26SidebarSection showHeading heading="Utilities" state="closed" />
		</Version26Sidebar>
	</div>

	<h2 class="title2-emphasized" id="overlays">Action Sheets & Alerts</h2>
	<p class="note">
		ActionSheet and Alert are full-screen materials: open a demo, then press Escape or tap the
		dimmed background to dismiss it.
	</p>
	<div class="row-flex">
		<Button
			id="open-action-sheet"
			type="filled"
			symbol="layers"
			label="Action Sheet"
			onPress={() => (actionSheetState = 'default')}
		/>
		<Button
			id="open-alert"
			type="filled"
			symbol="help"
			label="Alert"
			onPress={() => (alertState = 'default')}
		/>
		<Button
			id="open-v26-action-sheet"
			type="filled"
			symbol="auto_awesome"
			label="V26 Action Sheet"
			onPress={() => (v26ActionSheetState = 'default')}
		/>
		<Button
			id="open-v26-alert"
			type="filled"
			symbol="bolt"
			label="V26 Alert"
			onPress={() => (v26AlertState = 'default')}
		/>
	</div>
</main>

<ActionSheet
	bind:state={actionSheetState}
	showHeader
	headerTitle="Duplicate Photo?"
	showDescription
	headerDescription="You can also remove the original."
	showCancelButton
	cancelButtonLabel="Cancel"
>
	<ActionSheetButton label="Duplicate" onPress={() => (actionSheetState = 'hidden')} />
	<ActionSheetButton
		state="destructive"
		label="Delete Photo"
		onPress={() => (actionSheetState = 'hidden')}
	/>
	<ActionSheetButton state="disabled" label="Archive" />
</ActionSheet>

<Alert
	bind:state={alertState}
	title="Allow Access?"
	showDescription
	description="The demo would like to use your camera."
>
	<AlertTextField slot="text-field" value="" placeholder="Passcode" />
	<AlertButton
		slot="button-1"
		state="preferred"
		label="Allow"
		onPress={() => (alertState = 'hidden')}
	/>
	<AlertButton slot="button-2" label="Don't Allow" onPress={() => (alertState = 'hidden')} />
</Alert>

<Version26ActionSheet
	bind:state={v26ActionSheetState}
	showHeader
	headerTitle="Duplicate Photo?"
	showDescription
	headerDescription="A liquid glass action sheet."
>
	<Version26ActionSheetButton
		state="primary"
		label="Duplicate"
		onPress={() => (v26ActionSheetState = 'hidden')}
	/>
	<Version26ActionSheetButton
		state="secondary"
		label="Archive"
		onPress={() => (v26ActionSheetState = 'hidden')}
	/>
	<Version26ActionSheetButton
		state="destructive"
		label="Delete Photo"
		onPress={() => (v26ActionSheetState = 'hidden')}
	/>
</Version26ActionSheet>

<Version26Alert
	bind:state={v26AlertState}
	title="Allow Access?"
	showDescription
	description="A liquid glass alert with a text field."
>
	<Version26AlertTextField slot="text-field" value="" placeholder="Passcode" />
	<Version26AlertButton
		slot="button-1"
		state="primary"
		label="Allow"
		onPress={() => (v26AlertState = 'hidden')}
	/>
	<Version26AlertButton
		slot="button-2"
		state="secondary"
		label="Don't Allow"
		onPress={() => (v26AlertState = 'hidden')}
	/>
</Version26Alert>

<style>
	.new-components {
		display: flex;
		flex-wrap: wrap;
		gap: 8px 24px;
		margin-top: 12px;
		font-size: 15px;
	}

	.new-components a {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		min-height: 44px;
	}

	.content {
		margin-left: 320px;
		padding: 4px 28px 140px;
	}

	@media (max-width: 809px) {
		.content {
			margin-left: 0px;
		}
	}

	.kicker {
		color: var(--labels-secondary);
		margin: 20px 0px 8px;
		max-width: 640px;
	}

	h2 {
		margin: 40px 0px 4px;
		scroll-margin: 24px;
	}

	.note {
		color: var(--labels-secondary);
		margin: 0px 0px 16px;
		max-width: 640px;
	}

	.row-flex {
		align-items: center;
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
		margin: 0px 0px 16px;
	}

	.demo-width {
		margin: 0px 0px 16px;
		max-width: 100%;
		width: 380px;
	}

	.segmented-gap {
		margin-top: 16px;
	}

	.material-strip {
		align-items: center;
		background: var(--materials-regular);
		border-radius: 12px;
		display: flex;
		gap: 12px;
		margin: 0px 0px 16px;
		padding: 10px 14px;
		width: fit-content;
	}

	.device-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 24px;
		margin: 0px 0px 16px;
	}

	.device {
		background:
			radial-gradient(150px 150px at 18% 24%, rgb(0, 136, 255, 0.4), transparent 70%),
			radial-gradient(170px 170px at 82% 78%, rgb(255, 45, 85, 0.32), transparent 70%),
			radial-gradient(130px 130px at 62% 18%, rgb(52, 199, 89, 0.3), transparent 70%),
			linear-gradient(165deg, rgb(238, 243, 255), rgb(253, 240, 246));
		border-radius: 24px;
		box-shadow: inset 0px 0px 0px 1px rgb(0, 0, 0, 0.08);
		overflow: hidden;
		position: relative;
		transform: translateZ(0);
	}

	.bar-device {
		height: 160px;
		width: 380px;
	}

	.sidebar-device {
		height: 560px;
		width: 380px;
	}
</style>
